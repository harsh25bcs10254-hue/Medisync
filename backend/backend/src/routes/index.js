import { Router } from 'express';
import authRoutes from './authRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import adminRoutes from './adminRoutes.js';
import healthRecordRoutes from './healthRecordRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok', service: 'medisync-api' } });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/health-records', healthRecordRoutes);

export default router;
