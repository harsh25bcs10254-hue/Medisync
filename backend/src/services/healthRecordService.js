import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import HealthRecord from '../models/HealthRecord.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

function assertPatient(user) {
  if (user.role !== 'patient') {
    throw new ApiError(403, 'Only patient accounts can view their health records.');
  }
}

function assertDoctor(user) {
  if (user.role !== 'doctor') {
    throw new ApiError(403, 'Only doctors can update health records.');
  }
}

function serializeRecord(record) {
  return {
    id: record._id.toString(),
    appointmentId: record.appointment?.toString() ?? null,
    doctorSpecialty: record.doctorSpecialty || null,
    title: record.title,
    type: record.type,
    recordDate: record.recordDate,
    provider: record.provider,
    notes: record.notes,
    isDoctorAuthored: Boolean(record.doctor),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function recordDateForAppointment(date, appointment) {
  const recordDate = new Date(`${date}T00:00:00.000Z`);
  const appointmentDate = new Date(appointment.scheduledAt);
  appointmentDate.setUTCHours(0, 0, 0, 0);
  if (recordDate < appointmentDate || recordDate > new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)) {
    throw new ApiError(400, 'Record date must be on or after the appointment date and cannot be in the future.');
  }
  return recordDate;
}

async function findCompletedDoctorAppointment(user, appointmentId) {
  if (!mongoose.isValidObjectId(appointmentId)) throw new ApiError(400, 'Invalid appointment identifier.');
  const appointment = await Appointment.findOne({ _id: appointmentId, doctor: user.id });
  if (!appointment) throw new ApiError(404, 'Appointment not found.');
  if (appointment.status !== 'completed' || !appointment.completedAt) {
    throw new ApiError(409, 'Complete the appointment after its scheduled time before updating its health record.');
  }
  if (appointment.scheduledAt.getTime() + 30 * 60 * 1000 > Date.now()) {
    throw new ApiError(409, 'Health records can only be updated after the 30-minute appointment has ended.');
  }
  return appointment;
}

export async function listHealthRecords(user) {
  assertPatient(user);
  const patient = await User.findById(user.id)
    .select('_id')
    .populate({
      path: 'healthRecords',
      options: { sort: { recordDate: -1, createdAt: -1 } }
    });
  if (!patient) throw new ApiError(404, 'Patient account not found.');
  const records = patient.healthRecords;
  return records.map(serializeRecord);
}

export async function createHealthRecord(user, input) {
  assertDoctor(user);
  const appointment = await findCompletedDoctorAppointment(user, input.appointmentId);
  const existing = await HealthRecord.exists({ appointment: appointment._id });
  if (existing) throw new ApiError(409, 'A health record already exists for this appointment. Update that record instead.');

  try {
    const record = await HealthRecord.create({
      patient: appointment.patient,
      appointment: appointment._id,
      doctor: user.id,
      doctorSpecialty: appointment.doctorSpecialty,
      title: input.title,
      type: input.type,
      recordDate: recordDateForAppointment(input.recordDate, appointment),
      provider: appointment.doctorSpecialty || '',
      notes: input.notes
    });
    return serializeRecord(record);
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'A health record already exists for this appointment.');
    throw error;
  }
}

export async function updateHealthRecord(user, recordId, input) {
  assertDoctor(user);
  if (!mongoose.isValidObjectId(recordId)) throw new ApiError(400, 'Invalid health record identifier.');
  const record = await HealthRecord.findOne({ _id: recordId, doctor: user.id, appointment: { $ne: null } });
  if (!record) throw new ApiError(404, 'Health record not found.');
  const appointment = await findCompletedDoctorAppointment(user, record.appointment);

  if (input.recordDate) {
    record.recordDate = recordDateForAppointment(input.recordDate, appointment);
  }
  if (input.title !== undefined) record.title = input.title;
  if (input.type !== undefined) record.type = input.type;
  if (input.notes !== undefined) record.notes = input.notes;
  await record.save();
  return serializeRecord(record);
}
