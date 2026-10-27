import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  doctorSpecialty: {
    type: String,
    trim: true,
    maxlength: 100,
    default: null
  },
  appointmentFee: {
    type: Number,
    min: 0,
    max: 1000000,
    default: null
  },
  scheduledAt: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  completedAt: {
    type: Date,
    default: null
  },
  paymentOrderId: {
    type: String,
    default: undefined
  },
  paymentId: {
    type: String,
    default: undefined
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'not_required'],
    default: null
  },
  status: {
    type: String,
    enum: ['scheduled', 'cancelled', 'completed'],
    default: 'scheduled',
    required: true
  }
}, { timestamps: true, versionKey: false });

appointmentSchema.index(
  { doctor: 1, scheduledAt: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled' } }
);
appointmentSchema.index({ patient: 1, scheduledAt: 1 });
appointmentSchema.index({ paymentOrderId: 1 }, { unique: true, sparse: true });
appointmentSchema.index({ paymentId: 1 }, { unique: true, sparse: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
