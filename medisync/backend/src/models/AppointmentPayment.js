import mongoose from 'mongoose';

const appointmentPaymentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
    required: true
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
  amountPaise: {
    type: Number,
    min: 1,
    required: true
  },
  currency: {
    type: String,
    enum: ['INR'],
    default: 'INR',
    required: true
  },
  orderId: {
    type: String,
    default: undefined
  },
  paymentId: {
    type: String,
    default: undefined
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'expired', 'refund_required', 'refunded'],
    default: 'pending',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  }
}, { timestamps: true, versionKey: false, autoIndex: false });

appointmentPaymentSchema.index({ doctor: 1, scheduledAt: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'pending' }
});
appointmentPaymentSchema.index({ orderId: 1 }, { unique: true, sparse: true });
appointmentPaymentSchema.index({ paymentId: 1 }, { unique: true, sparse: true });

const AppointmentPayment = mongoose.model('AppointmentPayment', appointmentPaymentSchema);
export default AppointmentPayment;
