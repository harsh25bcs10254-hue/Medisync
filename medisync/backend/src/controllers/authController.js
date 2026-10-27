import * as authService from '../services/authService.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const accessCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000
});

const refreshCookieOptions = (maxAge = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge
});

function setAuthCookies(res, session) {
  res.cookie('accessToken', session.accessToken, accessCookieOptions());
  res.cookie('refreshToken', session.refreshToken, refreshCookieOptions(session.refreshTokenMaxAge));
}

function clearAuthCookies(res) {
  res.clearCookie('accessToken', accessCookieOptions());
  res.clearCookie('refreshToken', { ...refreshCookieOptions(), maxAge: undefined });
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, req);
  setAuthCookies(res, result);
  res.status(201).json({ success: true, message: 'Account created successfully.', data: { user: result.user } });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, req);
  setAuthCookies(res, result);
  res.status(200).json({ success: true, message: 'Login successful.', data: { user: result.user } });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refreshSession(req.cookies?.refreshToken, req);
  setAuthCookies(res, result);
  res.status(200).json({ success: true, message: 'Session refreshed.' });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.refreshToken);
  clearAuthCookies(res);
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('fullName role').lean();
  if (!user) throw new ApiError(401, 'Account is unavailable. Please log in again.');
  res.status(200).json({
    success: true,
    data: { user: { id: req.user.id, fullName: user.fullName, role: user.role } }
  });
});
