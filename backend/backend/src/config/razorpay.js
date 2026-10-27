import Razorpay from 'razorpay';
import { env } from './env.js';

let client;

// Initialize lazily so the API can run before Razorpay routes are implemented.
// Never expose RAZORPAY_KEY_SECRET to frontend code.
export function getRazorpayClient() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    const error = new Error('Razorpay test credentials are not configured.');
    error.statusCode = 503;
    throw error;
  }

  if (!client) {
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET
    });
  }

  return client;
}
