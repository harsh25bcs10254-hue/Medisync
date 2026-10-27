import * as adminService from '../services/adminService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listAccounts = asyncHandler(async (req, res) => {
  const accounts = await adminService.listManagedAccounts();
  res.status(200).json({ success: true, data: { accounts } });
});

export const createAccount = asyncHandler(async (req, res) => {
  const account = await adminService.createManagedAccount(req.body);
  res.status(201).json({ success: true, message: 'Account created.', data: { account } });
});

export const updateAccountStatus = asyncHandler(async (req, res) => {
  const account = await adminService.updateManagedAccountStatus(req.params.id, req.body.isActive);
  res.status(200).json({
    success: true,
    message: account.isActive ? 'Account enabled.' : 'Account disabled.',
    data: { account }
  });
});
