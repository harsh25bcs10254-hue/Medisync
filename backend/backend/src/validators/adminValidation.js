import { z } from 'zod';

const accountFields = {
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72)
};

export const createManagedAccountSchema = z.discriminatedUnion('role', [
  z.object({
    ...accountFields,
    role: z.literal('patient')
  }).strict(),
  z.object({
    ...accountFields,
    role: z.literal('doctor'),
    specialty: z.string().trim().min(2).max(100),
    appointmentFee: z.number().min(0).max(1000000)
  }).strict()
]);

export const updateManagedAccountStatusSchema = z.object({
  isActive: z.boolean()
}).strict();

export const managedAccountIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.')
}).strict();
