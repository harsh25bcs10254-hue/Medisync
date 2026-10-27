import Appointment from '../models/Appointment.js';
import AppointmentPayment from '../models/AppointmentPayment.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { getRazorpayClient } from '../config/razorpay.js';
import ApiError from '../utils/ApiError.js';
import { verifyRazorpaySignature } from '../utils/razorpaySignature.js';
import { serializeAppointment } from './appointmentService.js';

const PAYMENT_RESERVATION_MINUTES = 10;

function isDuplicateKey(error) {
  return error?.code === 11000;
}

async function createPaidAppointment(paymentRecord, paymentId) {
  const existing = await Appointment.findOne({ paymentOrderId: paymentRecord.orderId });
  if (existing) return existing;

  return Appointment.create({
    patient: paymentRecord.patient,
    doctor: paymentRecord.doctor,
    doctorSpecialty: paymentRecord.doctorSpecialty,
    appointmentFee: paymentRecord.appointmentFee,
    scheduledAt: paymentRecord.scheduledAt,
    reason: paymentRecord.reason,
    status: 'scheduled',
    paymentOrderId: paymentRecord.orderId,
    paymentId,
    paymentStatus: 'paid'
  });
}

async function refundCapturedPayment(razorpay, paymentRecord, gatewayPayment) {
  paymentRecord.paymentId = gatewayPayment.id;
  paymentRecord.status = 'refund_required';
  await paymentRecord.save();

  try {
    await razorpay.payments.refund(gatewayPayment.id, {
      amount: gatewayPayment.amount,
      notes: { reason: 'appointment_reservation_unavailable' }
    });
    paymentRecord.status = 'refunded';
    await paymentRecord.save();
  } catch (error) {
    console.error('Razorpay refund could not be initiated for a captured appointment payment.', error);
    throw new ApiError(
      502,
      `Payment was captured, but no appointment was booked and the automatic refund could not be started. Contact support with payment reference ${gatewayPayment.id}.`
    );
  }
}

export async function createAppointmentPayment(user, input) {
  const scheduledAt = new Date(input.scheduledAt);
  const now = new Date();
  if (scheduledAt <= now) throw new ApiError(400, 'Choose a future appointment time.');
  if (scheduledAt.getTime() > now.getTime() + 180 * 24 * 60 * 60 * 1000) {
    throw new ApiError(400, 'Appointments can only be booked up to six months ahead.');
  }
  const localTime = input.scheduledAt.match(/T\d{2}:(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/);
  if (!localTime || Number(localTime[1]) % 30 !== 0 || Number(localTime[2]) !== 0 || scheduledAt.getUTCMilliseconds() !== 0) {
    throw new ApiError(400, 'Choose a time on the hour or half-hour.');
  }

  const doctor = await User.findOne({
    _id: input.doctorId,
    role: 'doctor',
    isActive: true
  }).select('_id specialty appointmentFee');
  if (!doctor) throw new ApiError(404, 'That doctor is not available.');
  if (!Number.isFinite(doctor.appointmentFee)) {
    throw new ApiError(409, 'This doctor has not configured an appointment fee.');
  }

  const amountPaise = Math.round(doctor.appointmentFee * 100);
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 0) {
    throw new ApiError(400, 'The doctor appointment fee is invalid.');
  }

  if (await Appointment.exists({ doctor: doctor._id, scheduledAt, status: 'scheduled' })) {
    throw new ApiError(409, 'That appointment time has already been booked.');
  }

  await AppointmentPayment.updateMany({
    doctor: doctor._id,
    scheduledAt,
    status: 'pending',
    expiresAt: { $lte: now }
  }, { $set: { status: 'expired' } });

  if (amountPaise === 0) {
    const activeReservation = await AppointmentPayment.exists({
      doctor: doctor._id,
      scheduledAt,
      status: 'pending',
      expiresAt: { $gt: now }
    });
    if (activeReservation) throw new ApiError(409, 'That appointment time is currently being reserved by another payment.');
    try {
      const appointment = await Appointment.create({
        patient: user.id,
        doctor: doctor._id,
        doctorSpecialty: doctor.specialty,
        appointmentFee: doctor.appointmentFee,
        scheduledAt,
        reason: input.reason,
        status: 'scheduled',
        paymentStatus: 'not_required'
      });
      return { requiresPayment: false, appointment: serializeAppointment(appointment) };
    } catch (error) {
      if (isDuplicateKey(error)) throw new ApiError(409, 'That appointment time has already been booked.');
      throw error;
    }
  }

  const razorpay = getRazorpayClient();
  const paymentRecord = new AppointmentPayment({
    patient: user.id,
    doctor: doctor._id,
    doctorSpecialty: doctor.specialty,
    appointmentFee: doctor.appointmentFee,
    scheduledAt,
    reason: input.reason,
    amountPaise,
    expiresAt: new Date(now.getTime() + PAYMENT_RESERVATION_MINUTES * 60 * 1000)
  });

  try {
    await paymentRecord.save();
  } catch (error) {
    if (isDuplicateKey(error)) throw new ApiError(409, 'That appointment time is currently being reserved by another payment.');
    throw error;
  }

  try {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `apt-${paymentRecord._id.toString()}`,
      notes: {
        appointmentPaymentId: paymentRecord._id.toString()
      }
    });
    paymentRecord.orderId = order.id;
    await paymentRecord.save();

    return {
      requiresPayment: true,
      payment: {
        id: paymentRecord._id.toString(),
        keyId: env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        doctorSpecialty: doctor.specialty || 'Consultation',
        expiresAt: paymentRecord.expiresAt
      }
    };
  } catch (error) {
    paymentRecord.status = 'failed';
    await paymentRecord.save();
    throw error;
  }
}

export async function verifyAppointmentPayment(user, input) {
  const paymentRecord = await AppointmentPayment.findOne({
    orderId: input.orderId,
    patient: user.id
  });
  if (!paymentRecord) throw new ApiError(404, 'Payment order not found.');

  if (paymentRecord.status === 'paid' && paymentRecord.appointment) {
    const appointment = await Appointment.findById(paymentRecord.appointment);
    if (appointment) return serializeAppointment(appointment);
  }
  if (paymentRecord.status === 'refund_required' || paymentRecord.status === 'refunded') {
    throw new ApiError(409, paymentRecord.status === 'refunded'
      ? 'This payment was already refunded. No appointment was booked.'
      : 'This captured payment requires refund review. No appointment was booked.');
  }

  if (!verifyRazorpaySignature(input.orderId, input.paymentId, input.signature, env.RAZORPAY_KEY_SECRET)) {
    throw new ApiError(400, 'Payment signature could not be verified.');
  }

  const razorpay = getRazorpayClient();
  let gatewayPayment = await razorpay.payments.fetch(input.paymentId);
  if (gatewayPayment.order_id !== paymentRecord.orderId
    || gatewayPayment.amount !== paymentRecord.amountPaise
    || gatewayPayment.currency !== paymentRecord.currency) {
    throw new ApiError(400, 'Payment details do not match this appointment order.');
  }

  if (gatewayPayment.status === 'authorized') {
    await razorpay.payments.capture(gatewayPayment.id, gatewayPayment.amount, gatewayPayment.currency);
    gatewayPayment = await razorpay.payments.fetch(gatewayPayment.id);
  }

  if (gatewayPayment.status !== 'captured') {
    if (gatewayPayment.status === 'failed') {
      paymentRecord.paymentId = gatewayPayment.id;
      paymentRecord.status = 'failed';
      await paymentRecord.save();
    }
    throw new ApiError(409, 'Payment has not completed successfully. No appointment has been booked.');
  }

  if (paymentRecord.status !== 'pending' || paymentRecord.expiresAt <= new Date()) {
    await refundCapturedPayment(razorpay, paymentRecord, gatewayPayment);
    throw new ApiError(409, 'The payment reservation expired. No appointment was booked; a refund was requested.');
  }

  let appointment;
  try {
    appointment = await createPaidAppointment(paymentRecord, gatewayPayment.id);
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    appointment = await Appointment.findOne({ paymentOrderId: paymentRecord.orderId });
    if (!appointment) {
      await refundCapturedPayment(razorpay, paymentRecord, gatewayPayment);
      throw new ApiError(409, 'The appointment time is no longer available. No appointment was booked; a refund was requested.');
    }
  }

  paymentRecord.paymentId = gatewayPayment.id;
  paymentRecord.status = 'paid';
  paymentRecord.appointment = appointment._id;
  await paymentRecord.save();
  return serializeAppointment(appointment);
}
