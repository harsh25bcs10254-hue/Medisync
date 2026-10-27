import { Router } from 'express';
import * as appointmentController from '../controllers/appointmentController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validateRequest.js';
import { createAppointmentSchema, idParamSchema, appointmentAvailabilitySchema, validateParams, validateQuery, verifyAppointmentPaymentSchema } from '../validators/careValidation.js';

const router = Router();

router.get('/doctors', authenticate, authorize('patient'), appointmentController.listDoctors);
router.get('/availability', authenticate, authorize('patient'), validateQuery(appointmentAvailabilitySchema), appointmentController.listBookedSlots);
router.get('/doctor', authenticate, authorize('doctor'), appointmentController.listDoctorAppointments);
router.get('/', authenticate, authorize('patient'), appointmentController.listAppointments);
router.post('/', authenticate, authorize('patient'), validateBody(createAppointmentSchema), appointmentController.createAppointment);
router.post('/verify-payment', authenticate, authorize('patient'), validateBody(verifyAppointmentPaymentSchema), appointmentController.verifyAppointmentPayment);
router.patch('/:id/cancel', authenticate, authorize('patient'), validateParams(idParamSchema), appointmentController.cancelAppointment);
router.patch('/:id/complete', authenticate, authorize('doctor'), validateParams(idParamSchema), appointmentController.completeAppointment);

export default router;
