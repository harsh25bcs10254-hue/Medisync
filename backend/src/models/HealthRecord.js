import mongoose from 'mongoose';

const healthRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  doctorSpecialty: {
    type: String,
    trim: true,
    maxlength: 100,
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120
  },
  type: {
    type: String,
    enum: ['visit', 'lab', 'prescription', 'vaccination', 'other'],
    required: true
  },
  recordDate: {
    type: Date,
    required: true
  },
  provider: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  }
}, { timestamps: true, versionKey: false });

healthRecordSchema.index({ patient: 1, recordDate: -1 });
healthRecordSchema.index({ appointment: 1 }, { unique: true, partialFilterExpression: { appointment: { $type: 'objectId' } } });

const HealthRecord = mongoose.model('HealthRecord', healthRecordSchema);
export default HealthRecord;
