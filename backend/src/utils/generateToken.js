import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function generateAccessToken(user) {
  return jwt.sign(
    { role: user.role },
    env.JWT_ACCESS_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
      issuer: 'medisync-api',
      audience: 'medisync-client'
    }
  );
}
