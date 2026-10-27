import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { env } from '../config/env.js';
import { generateAccessToken } from '../utils/generateToken.js';
import ApiError from '../utils/ApiError.js';

const hashRefreshToken = (token) => createHash('sha256').update(token).digest('hex');
const makeRefreshToken = () => randomBytes(48).toString('base64url');

function publicUser(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

async function createRefreshRecord({ userId, rawToken, familyId, req }) {
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    user: userId,
    tokenHash: hashRefreshToken(rawToken),
    familyId,
    expiresAt,
    userAgent: req.get('user-agent')?.slice(0, 500),
    ipAddress: req.ip?.slice(0, 100)
  });
  return expiresAt;
}

export async function register({ fullName, email, password }, req) {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.exists({ email: normalizedEmail });
  if (existingUser) throw new ApiError(409, 'An account with this email already exists.');

  // Public registration always creates a patient. Staff roles must be provisioned by an admin.
  let user;
  try {
    user = await User.create({ fullName, email: normalizedEmail, password, role: 'patient' });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'An account with this email already exists.');
    throw error;
  }

  const session = await createSession(user, req);
  return { user: publicUser(user), ...session };
}

export async function login({ email, password }, req) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled.');

  const session = await createSession(user, req);
  return { user: publicUser(user), ...session };
}

async function createSession(user, req) {
  const refreshToken = makeRefreshToken();
  const refreshExpiresAt = await createRefreshRecord({
    userId: user._id,
    rawToken: refreshToken,
    familyId: randomUUID(),
    req
  });

  return {
    accessToken: generateAccessToken(user),
    refreshToken,
    accessTokenMaxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
    refreshTokenMaxAge: Math.max(0, refreshExpiresAt.getTime() - Date.now())
  };
}

export async function refreshSession(rawToken, req) {
  if (!rawToken) throw new ApiError(401, 'Refresh token is missing.');

  const tokenHash = hashRefreshToken(rawToken);
  const current = await RefreshToken.findOne({ tokenHash }).select('+tokenHash +replacedByTokenHash');

  if (!current) throw new ApiError(401, 'Refresh token is invalid or expired. Please log in again.');

  // A revoked token being used again can indicate token theft. Revoke all active tokens in its family.
  if (current.revokedAt) {
    await RefreshToken.updateMany(
      { familyId: current.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    throw new ApiError(401, 'Refresh token reuse detected. Please log in again.');
  }

  if (current.expiresAt <= new Date()) {
    current.revokedAt = new Date();
    await current.save();
    throw new ApiError(401, 'Refresh token expired. Please log in again.');
  }

  const user = await User.findById(current.user);
  if (!user || !user.isActive) {
    await RefreshToken.updateMany(
      { familyId: current.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    throw new ApiError(401, 'Account is unavailable. Please log in again.');
  }

  const nextRawToken = makeRefreshToken();
  const nextHash = hashRefreshToken(nextRawToken);
  const nextExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Create the successor before atomically consuming the old token. If another request wins,
  // remove this unused successor and revoke the family as a replay precaution.
  await RefreshToken.create({
    user: user._id,
    tokenHash: nextHash,
    familyId: current.familyId,
    expiresAt: nextExpiresAt,
    userAgent: req.get('user-agent')?.slice(0, 500),
    ipAddress: req.ip?.slice(0, 100)
  });

  const consumed = await RefreshToken.findOneAndUpdate(
    { _id: current._id, revokedAt: null },
    { $set: { revokedAt: new Date(), replacedByTokenHash: nextHash } },
    { new: true }
  );

  if (!consumed) {
    await RefreshToken.deleteOne({ tokenHash: nextHash });
    await RefreshToken.updateMany(
      { familyId: current.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    throw new ApiError(401, 'Refresh token reuse detected. Please log in again.');
  }

  return {
    accessToken: generateAccessToken(user),
    refreshToken: nextRawToken,
    accessTokenMaxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
    refreshTokenMaxAge: Math.max(0, nextExpiresAt.getTime() - Date.now())
  };
}

export async function logout(rawToken) {
  if (!rawToken) return;
  await RefreshToken.updateOne(
    { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'medisync-api',
      audience: 'medisync-client'
    });
  } catch {
    throw new ApiError(401, 'Access token is invalid or expired.');
  }
}
