import mongoose from 'mongoose';
import RefreshToken from '../models/RefreshToken.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const MANAGED_ROLES = ['patient', 'doctor'];

function serializeAccount(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    specialty: user.specialty,
    appointmentFee: user.appointmentFee,
    isActive: user.isActive,
    createdAt: user.createdAt
  };
}

export async function listManagedAccounts() {
  const users = await User.find({ role: { $in: MANAGED_ROLES } })
    .select('fullName email role specialty appointmentFee isActive createdAt')
    .sort({ role: 1, fullName: 1 })
    .lean();
  return users.map(serializeAccount);
}

export async function createManagedAccount(input) {
  const normalizedEmail = input.email.toLowerCase().trim();
  try {
    const user = await User.create({
      ...input,
      email: normalizedEmail,
      isActive: true
    });
    return serializeAccount(user);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'An account with this email already exists.');
    }
    throw error;
  }
}

export async function updateManagedAccountStatus(accountId, isActive) {
  if (!mongoose.isValidObjectId(accountId)) throw new ApiError(400, 'Invalid account identifier.');
  const account = await User.findOne({
    _id: accountId,
    role: { $in: MANAGED_ROLES }
  });
  if (!account) throw new ApiError(404, 'Patient or doctor account not found.');

  account.isActive = isActive;
  await account.save();
  if (!isActive) {
    await RefreshToken.updateMany(
      { user: account._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
  return serializeAccount(account);
}
