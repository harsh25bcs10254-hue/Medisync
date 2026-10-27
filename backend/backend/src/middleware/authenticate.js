import { verifyAccessToken } from '../services/authService.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/User.js';

export async function authenticate(req, res, next) {
  const token = req.cookies?.accessToken;
  if (!token) return next(new ApiError(401, 'Authentication required.'));

  try {
    const payload = verifyAccessToken(token);
    if (!payload.sub || !payload.role) throw new ApiError(401, 'Access token is invalid.');
    const user = await User.findById(payload.sub).select('role isActive').lean();
    if (!user || !user.isActive) throw new ApiError(401, 'Account is unavailable. Please log in again.');
    req.user = { id: payload.sub, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}
