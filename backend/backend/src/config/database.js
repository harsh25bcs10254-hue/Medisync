import mongoose from 'mongoose';
import AppointmentPayment from '../models/AppointmentPayment.js';
import { env } from './env.js';

async function ensureAppointmentPaymentIndexes() {
  const collection = AppointmentPayment.collection;
  const exists = await mongoose.connection.db
    .listCollections({ name: collection.collectionName }, { nameOnly: true })
    .hasNext();
  const indexes = exists ? await collection.indexes() : [];
  const existingSlotIndex = indexes.find((index) => (
    index.unique && index.key.doctor === 1 && index.key.scheduledAt === 1
  ));
  const hasPendingOnlyConstraint = existingSlotIndex?.partialFilterExpression?.status === 'pending';

  if (existingSlotIndex && !hasPendingOnlyConstraint) {
    const hasDuplicatePendingSlots = await collection.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: { doctor: '$doctor', scheduledAt: '$scheduledAt' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 }
    ]).hasNext();
    if (hasDuplicatePendingSlots) {
      throw new Error('Cannot migrate appointment payment slot index: duplicate pending reservations exist.');
    }
    await collection.dropIndex(existingSlotIndex.name);
  }

  const indexesToCreate = [
    collection.createIndex({ orderId: 1 }, { name: 'orderId_1', unique: true, sparse: true }),
    collection.createIndex({ paymentId: 1 }, { name: 'paymentId_1', unique: true, sparse: true })
  ];
  if (!hasPendingOnlyConstraint) {
    indexesToCreate.push(collection.createIndex({ doctor: 1, scheduledAt: 1 }, {
      name: 'doctor_1_scheduledAt_1',
      unique: true,
      partialFilterExpression: { status: 'pending' }
    }));
  }
  await Promise.all(indexesToCreate);
}

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  await ensureAppointmentPaymentIndexes();
  console.log('MongoDB connected');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
