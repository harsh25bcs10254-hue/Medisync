import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const USER_ROLES = [
  'patient',
  'doctor',
  'receptionist',
  'labTechnician',
  'billingStaff',
  'hospitalAdmin',
  'superadmin'
];

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    maxlength: 254
  },
  password: {
    type: String,
    required: true,
    select: false,
    minlength: 8
  },
  role: {
    type: String,
    enum: USER_ROLES,
    default: 'patient',
    required: true,
    index: true
  },
  specialty: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
    default: null
  },
  appointmentFee: {
    type: Number,
    min: 0,
    max: 1000000,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  passwordChangedAt: Date
}, { timestamps: true, versionKey: false });

userSchema.virtual('appointments', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'patient'
});

userSchema.virtual('doctorAppointments', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'doctor'
});

userSchema.virtual('healthRecords', {
  ref: 'HealthRecord',
  localField: '_id',
  foreignField: 'patient'
});

userSchema.virtual('authoredHealthRecords', {
  ref: 'HealthRecord',
  localField: '_id',
  foreignField: 'doctor'
});

userSchema.pre('save', async function hashPasswordIfChanged() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.statics.roles = USER_ROLES;

const User = mongoose.model('User', userSchema);
export default User;
