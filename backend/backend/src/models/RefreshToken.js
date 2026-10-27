import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    select: false
  },
  familyId: {
    type: String,
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  },
  revokedAt: { type: Date, default: null, index: true },
  replacedByTokenHash: { type: String, default: null, select: false },
  userAgent: { type: String, maxlength: 500 },
  ipAddress: { type: String, maxlength: 100 }
}, { timestamps: true, versionKey: false });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
