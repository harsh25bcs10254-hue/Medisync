import { env } from './src/config/env.js';
import { connectDatabase, disconnectDatabase } from './src/config/database.js';
import Appointment from './src/models/Appointment.js';
import HealthRecord from './src/models/HealthRecord.js';
import User from './src/models/User.js';

const demoUsers = [
  { fullName: 'Demo Patient', email: 'patient@medisync.test', role: 'patient' },
  { fullName: 'Demo Doctor', email: 'doctor@medisync.test', role: 'doctor', specialty: 'General Medicine', appointmentFee: 500 },
  { fullName: 'Dr. Aisha Mehta', email: 'doctor.cardiology@medisync.test', role: 'doctor', specialty: 'Cardiology', appointmentFee: 1200 },
  { fullName: 'Dr. Rohan Kapoor', email: 'doctor.dermatology@medisync.test', role: 'doctor', specialty: 'Dermatology', appointmentFee: 800 },
  { fullName: 'Dr. Neha Iyer', email: 'doctor.pediatrics@medisync.test', role: 'doctor', specialty: 'Pediatrics', appointmentFee: 700 },
  { fullName: 'Demo Receptionist', email: 'receptionist@medisync.test', role: 'receptionist' },
  { fullName: 'Demo Lab Technician', email: 'labtech@medisync.test', role: 'labTechnician' },
  { fullName: 'Demo Billing Staff', email: 'billing@medisync.test', role: 'billingStaff' },
  { fullName: 'Demo Hospital Admin', email: 'hospitaladmin@medisync.test', role: 'hospitalAdmin' },
  { fullName: 'Demo Superadmin', email: 'superadmin@medisync.test', role: 'superadmin' }
];

function nextDemoSlot(daysAhead, hour = 9) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

function appointmentDate(date) {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

async function seedUsers(password) {
  const usersByEmail = new Map();
  let created = 0;
  let updated = 0;

  for (const demoUser of demoUsers) {
    const accountPassword = demoUser.email === 'hospitaladmin@medisync.test'
      ? process.env.SEED_ADMIN_PASSWORD || password
      : password;
    let user = await User.findOne({ email: demoUser.email });
    if (!user) {
      user = await User.create({ ...demoUser, password: accountPassword, isActive: true });
      created++;
      console.log(`Created ${demoUser.role}: ${demoUser.email}`);
    } else {
      user.fullName = demoUser.fullName;
      user.role = demoUser.role;
      if (demoUser.email === 'hospitaladmin@medisync.test' && process.env.SEED_ADMIN_PASSWORD) {
        user.password = accountPassword;
      }
      if (demoUser.role === 'doctor') {
        user.specialty = demoUser.specialty;
        user.appointmentFee = demoUser.appointmentFee;
      }
      if (user.isActive === undefined) user.isActive = true;
      await user.save();
      updated++;
      console.log(`Updated demo profile: ${demoUser.email}`);
    }
    usersByEmail.set(demoUser.email, user);
  }

  return { usersByEmail, created, updated };
}

async function seedFutureAppointment({ patient, doctor, daysAhead, reason }) {
  const scheduledAt = nextDemoSlot(daysAhead);
  let appointment = await Appointment.findOne({ patient: patient._id, doctor: doctor._id, reason });

  if (appointment?.status === 'completed') return appointment;
  if (!appointment) {
    appointment = new Appointment({ patient: patient._id, doctor: doctor._id, reason });
  }

  appointment.doctorSpecialty = doctor.specialty;
  appointment.appointmentFee = doctor.appointmentFee;
  appointment.scheduledAt = scheduledAt;
  appointment.status = 'scheduled';
  appointment.completedAt = null;
  await appointment.save();
  console.log(`Prepared appointment: ${doctor.specialty} on ${scheduledAt.toISOString()}`);
  return appointment;
}

async function seedCompletedAppointment({ patient, doctor }) {
  const scheduledAt = nextDemoSlot(-2, 9);
  const reason = 'Demo completed visit';
  let appointment = await Appointment.findOne({ patient: patient._id, doctor: doctor._id, reason });
  if (!appointment) {
    appointment = new Appointment({ patient: patient._id, doctor: doctor._id, reason });
  }

  appointment.doctorSpecialty = doctor.specialty;
  appointment.appointmentFee = doctor.appointmentFee;
  appointment.scheduledAt = scheduledAt;
  appointment.status = 'completed';
  appointment.completedAt ??= new Date();
  await appointment.save();

  let record = await HealthRecord.findOne({ appointment: appointment._id });
  if (!record) {
    await HealthRecord.create({
      patient: patient._id,
      appointment: appointment._id,
      doctor: doctor._id,
      doctorSpecialty: doctor.specialty,
      title: 'Demo consultation summary',
      type: 'visit',
      recordDate: appointmentDate(scheduledAt),
      provider: doctor.specialty,
      notes: 'Synthetic demo note: routine consultation completed. No real patient information.'
    });
    console.log('Created sample doctor-authored health record.');
  }
  console.log('Prepared completed demo appointment for the doctor workflow.');
}

async function seedDatabase() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Seeding is disabled in production.');
  }
  if (process.env.SEED_DEMO_DATA !== 'true') {
    throw new Error('Set SEED_DEMO_DATA=true in the process environment to enable demo seeding.');
  }

  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Set SEED_DEMO_PASSWORD with at least 12 characters.');
  }
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminPassword && (adminPassword.length < 12 || adminPassword.length > 72)) {
    throw new Error('SEED_ADMIN_PASSWORD must contain between 12 and 72 characters.');
  }

  await connectDatabase();
  try {
    const { usersByEmail, created, updated } = await seedUsers(password);
    const patient = usersByEmail.get('patient@medisync.test');
    const generalMedicineDoctor = usersByEmail.get('doctor@medisync.test');

    await seedCompletedAppointment({ patient, doctor: generalMedicineDoctor });

    const futureDoctors = [
      { email: 'doctor@medisync.test', daysAhead: 2 },
      { email: 'doctor.cardiology@medisync.test', daysAhead: 3 },
      { email: 'doctor.dermatology@medisync.test', daysAhead: 4 },
      { email: 'doctor.pediatrics@medisync.test', daysAhead: 5 }
    ];

    for (const demoAppointment of futureDoctors) {
      await seedFutureAppointment({
        patient,
        doctor: usersByEmail.get(demoAppointment.email),
        daysAhead: demoAppointment.daysAhead,
        reason: `Demo upcoming visit - ${demoAppointment.email}`
      });
    }

    console.log('\nDemo seeding completed.');
    console.log(`Users created: ${created}`);
    console.log(`Existing demo users updated: ${updated}`);
    console.log('Prepared 4 upcoming appointments, 1 completed appointment, and 1 health record.');
    console.log('All newly created demo accounts use the password configured in SEED_DEMO_PASSWORD.');
  } finally {
    await disconnectDatabase();
  }
}

seedDatabase().catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exitCode = 1;
});
