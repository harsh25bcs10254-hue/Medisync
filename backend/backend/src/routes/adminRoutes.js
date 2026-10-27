import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validateRequest.js';
import { validateParams } from '../validators/careValidation.js';
import {
  createManagedAccountSchema,
  managedAccountIdSchema,
  updateManagedAccountStatusSchema
} from '../validators/adminValidation.js';

const router = Router();
const adminOnly = [authenticate, authorize('hospitalAdmin', 'superadmin')];

router.get('/accounts', ...adminOnly, adminController.listAccounts);
router.post('/accounts', ...adminOnly, validateBody(createManagedAccountSchema), adminController.createAccount);
router.patch(
  '/accounts/:id/status',
  ...adminOnly,
  validateParams(managedAccountIdSchema),
  validateBody(updateManagedAccountStatusSchema),
  adminController.updateAccountStatus
);

export default router;
