import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import AppointmentPayment from '../models/AppointmentPayment.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

export function assertPatient(user) {
  if (user.role !== 'patient') {
    throw new ApiError(403, 'Only patient accounts can manage appointments.');
  }
}

export function serializeAppointment(appointment) {
  return {
    id: appointment._id.toString(),
    doctor: appointment.doctor
      ? {
          specialty: appointment.doctorSpecialty || appointment.doctor.specialty || 'Specialty not provided',
          appointmentFee: appointment.appointmentFee ?? appointment.doctor.appointmentFee ?? null,
          currency: 'INR'
        }
      : null,
    scheduledAt: appointment.scheduledAt,
    reason: appointment.reason,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus || null,
    createdAt: appointment.createdAt
  };
}

export async function listDoctors(user) {
  assertPatient(user);
  const doctors = await User.find({ role: 'doctor', isActive: true })
    .select('specialty appointmentFee')
    .sort({ specialty: 1, appointmentFee: 1 })
    .lean();
  return doctors.map((doctor) => ({
    id: doctor._id.toString(),
    specialty: doctor.specialty || 'Specialty not provided',
    appointmentFee: doctor.appointmentFee ?? null,
    currency: 'INR'
  }));
}

export async function listBookedSlots(user, input) {
  assertPatient(user);
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  const dayLength = endAt.getTime() - startAt.getTime();
  if (dayLength < 23 * 60 * 60 * 1000 || dayLength > 25 * 60 * 60 * 1000) {
    throw new ApiError(400, 'Choose a single local calendar day.');
  }

  const doctor = await User.findOne({
    _id: input.doctorId,
    role: 'doctor',
    isActive: true
  }).select('_id');
  if (!doctor) throw new ApiError(404, 'That doctor is not available.');

  const [appointments, pendingPayments] = await Promise.all([Appointment.find({
    doctor: doctor._id,
    status: 'scheduled',
    scheduledAt: { $gte: startAt, $lt: endAt }
  }).select('scheduledAt').lean(), AppointmentPayment.find({
    doctor: doctor._id,
    status: 'pending',
    expiresAt: { $gt: new Date() },
    scheduledAt: { $gte: startAt, $lt: endAt }
  }).select('scheduledAt').lean()]);
  return [...appointments, ...pendingPayments].map((appointment) => appointment.scheduledAt);
}

export async function listAppointments(user) {
  assertPatient(user);
  const patient = await User.findById(user.id)
    .select('_id')
    .populate({
      path: 'appointments',
      options: { sort: { scheduledAt: 1 } },
      populate: { path: 'doctor', select: 'specialty appointmentFee' }
    });
  if (!patient) throw new ApiError(404, 'Patient account not found.');
  const appointments = patient.appointments;
  return appointments
    .sort((a, b) => Number(a.status === 'cancelled') - Number(b.status === 'cancelled'))
    .map(serializeAppointment);
}

export async function listDoctorAppointments(user) {
  if (user.role !== 'doctor') throw new ApiError(403, 'Only doctor accounts can view their appointments.');
  const doctor = await User.findById(user.id)
    .select('_id')
    .populate({
      path: 'doctorAppointments',
      options: { sort: { scheduledAt: -1 } },
      populate: { path: 'patient', select: 'fullName' }
    });
  if (!doctor) throw new ApiError(404, 'Doctor account not found.');
  const appointments = doctor.doctorAppointments;
  appointments.sort((a, b) => Number(a.status === 'cancelled') - Number(b.status === 'cancelled'));
  const appointmentIds = appointments.map((appointment) => appointment._id);
  await doctor.populate({
    path: 'authoredHealthRecords',
    match: { appointment: { $in: appointmentIds } },
    select: 'appointment title type recordDate notes'
  });
  const recordsByAppointment = new Map(
    doctor.authoredHealthRecords
      .map((record) => [record.appointment.toString(), record])
  );

  return appointments.map((appointment) => {
    const record = recordsByAppointment.get(appointment._id.toString());
    return {
      id: appointment._id.toString(),
      patient: appointment.patient
        ? { id: appointment.patient._id.toString(), fullName: appointment.patient.fullName }
        : null,
      scheduledAt: appointment.scheduledAt,
      reason: appointment.reason,
      status: appointment.status,
      completedAt: appointment.completedAt,
      healthRecord: record ? {
        id: record._id.toString(),
        title: record.title,
        type: record.type,
        recordDate: record.recordDate,
        notes: record.notes
      } : null
    };
  });
}

export async function completeAppointment(user, appointmentId) {
  if (user.role !== 'doctor') throw new ApiError(403, 'Only the assigned doctor can complete this appointment.');
  if (!mongoose.isValidObjectId(appointmentId)) throw new ApiError(400, 'Invalid appointment identifier.');
  const appointment = await Appointment.findOne({ _id: appointmentId, doctor: user.id });
  if (!appointment) throw new ApiError(404, 'Appointment not found.');
  if (appointment.status === 'cancelled') throw new ApiError(409, 'Cancelled appointments cannot be completed.');
  if (appointment.scheduledAt.getTime() + 30 * 60 * 1000 > Date.now()) {
    throw new ApiError(409, 'An appointment can only be completed after its 30-minute scheduled duration.');
  }
  if (appointment.status !== 'completed') {
    appointment.status = 'completed';
    appointment.completedAt = new Date();
    await appointment.save();
  }
  return {
    id: appointment._id.toString(),
    status: appointment.status,
    completedAt: appointment.completedAt
  };
}

export async function cancelAppointment(user, appointmentId) {
  assertPatient(user);
  if (!mongoose.isValidObjectId(appointmentId)) throw new ApiError(400, 'Invalid appointment identifier.');
  const appointment = await Appointment.findOne({ _id: appointmentId, patient: user.id });
  if (!appointment) throw new ApiError(404, 'Appointment not found.');
  if (appointment.status !== 'scheduled') throw new ApiError(409, 'This appointment is no longer active.');
  if (appointment.scheduledAt <= new Date()) throw new ApiError(409, 'Past appointments cannot be cancelled.');

  appointment.status = 'cancelled';
  await appointment.save();
  await appointment.populate({ path: 'doctor', select: 'specialty appointmentFee' });
  return {
    ...serializeAppointment(appointment),
    refundMessage: appointment.paymentStatus === 'paid'
      ? 'This paid appointment was cancelled. A refund is not issued automatically.'
      : null
  };
}
