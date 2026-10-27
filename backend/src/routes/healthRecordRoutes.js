import { Router } from 'express';
import * as healthRecordController from '../controllers/healthRecordController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validateRequest.js';
import { createHealthRecordSchema, idParamSchema, updateHealthRecordSchema, validateParams } from '../validators/careValidation.js';

const router = Router();

router.get('/', authenticate, authorize('patient'), healthRecordController.listHealthRecords);
router.post('/', authenticate, authorize('doctor'), validateBody(createHealthRecordSchema), healthRecordController.createHealthRecord);
router.patch('/:id', authenticate, authorize('doctor'), validateParams(idParamSchema), validateBody(updateHealthRecordSchema), healthRecordController.updateHealthRecord);

export default router;
