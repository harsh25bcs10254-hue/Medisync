import * as healthRecordService from '../services/healthRecordService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listHealthRecords = asyncHandler(async (req, res) => {
  const records = await healthRecordService.listHealthRecords(req.user);
  res.status(200).json({ success: true, data: { records } });
});

export const createHealthRecord = asyncHandler(async (req, res) => {
  const record = await healthRecordService.createHealthRecord(req.user, req.body);
  res.status(201).json({ success: true, message: 'Health record saved.', data: { record } });
});

export const updateHealthRecord = asyncHandler(async (req, res) => {
  const record = await healthRecordService.updateHealthRecord(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Health record updated.', data: { record } });
});
