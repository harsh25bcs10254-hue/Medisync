import * as appointmentService from '../services/appointmentService.js';
import * as appointmentPaymentService from '../services/appointmentPaymentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listDoctors = asyncHandler(async (req, res) => {
  const doctors = await appointmentService.listDoctors(req.user);
  res.status(200).json({ success: true, data: { doctors } });
});

export const listBookedSlots = asyncHandler(async (req, res) => {
  const bookedSlots = await appointmentService.listBookedSlots(req.user, req.validatedQuery);
  res.status(200).json({ success: true, data: { bookedSlots } });
});

export const listAppointments = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.listAppointments(req.user);
  res.status(200).json({ success: true, data: { appointments } });
});

export const listDoctorAppointments = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.listDoctorAppointments(req.user);
  res.status(200).json({ success: true, data: { appointments } });
});

export const createAppointment = asyncHandler(async (req, res) => {
  const checkout = await appointmentPaymentService.createAppointmentPayment(req.user, req.body);
  res.status(201).json({
    success: true,
    message: checkout.requiresPayment
      ? 'Payment order created. The appointment is confirmed only after payment succeeds.'
      : 'Appointment booked.',
    data: checkout
  });
});

export const verifyAppointmentPayment = asyncHandler(async (req, res) => {
  const appointment = await appointmentPaymentService.verifyAppointmentPayment(req.user, req.body);
  res.status(201).json({
    success: true,
    message: 'Payment verified and appointment booked.',
    data: { appointment }
  });
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Appointment cancelled.', data: { appointment } });
});

export const completeAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.completeAppointment(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Appointment marked complete.', data: { appointment } });
});
