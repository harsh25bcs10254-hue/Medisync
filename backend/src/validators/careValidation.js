import { z } from 'zod';
import ApiError from '../utils/ApiError.js';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
const dateTimeSchema = z.iso.datetime({ offset: true });

export const createAppointmentSchema = z.object({
  doctorId: objectIdSchema,
  scheduledAt: dateTimeSchema,
  reason: z.string().trim().max(500).optional().default('')
}).strict();

export const verifyAppointmentPaymentSchema = z.object({
  orderId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(100),
  signature: z.string().regex(/^[a-f\d]{64}$/i, 'Invalid payment signature.')
}).strict();

export const appointmentAvailabilitySchema = z.object({
  doctorId: objectIdSchema,
  startAt: dateTimeSchema,
  endAt: dateTimeSchema
}).strict();

export const createHealthRecordSchema = z.object({
  appointmentId: objectIdSchema,
  title: z.string().trim().min(2).max(120),
  type: z.enum(['visit', 'lab', 'prescription', 'vaccination', 'other']),
  recordDate: z.iso.date(),
  notes: z.string().trim().max(2000).optional().default('')
}).strict();

export const updateHealthRecordSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  type: z.enum(['visit', 'lab', 'prescription', 'vaccination', 'other']).optional(),
  recordDate: z.iso.date().optional(),
  notes: z.string().trim().max(2000).optional()
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const idParamSchema = z.object({
  id: objectIdSchema
}).strict();

export function validateParams(schema) {
  return function validateParamsMiddleware(req, res, next) {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(new ApiError(400, 'Invalid route parameter.', result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))));
    }
    req.params = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return function validateQueryMiddleware(req, res, next) {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new ApiError(400, 'Request validation failed.', result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))));
    }
    req.validatedQuery = result.data;
    next();
  };
}
