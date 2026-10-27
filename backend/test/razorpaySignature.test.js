import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { verifyRazorpaySignature } from '../src/utils/razorpaySignature.js';

const secret = 'test-secret-for-signature-verification';
const orderId = 'order_test_123';
const paymentId = 'pay_test_456';
const signature = createHmac('sha256', secret)
  .update(`${orderId}|${paymentId}`)
  .digest('hex');

test('accepts a valid Razorpay HMAC signature', () => {
  assert.equal(verifyRazorpaySignature(orderId, paymentId, signature, secret), true);
});

test('rejects a signature for a different payment', () => {
  assert.equal(verifyRazorpaySignature(orderId, 'pay_test_other', signature, secret), false);
});

test('rejects malformed or missing signatures', () => {
  assert.equal(verifyRazorpaySignature(orderId, paymentId, 'not-a-signature', secret), false);
  assert.equal(verifyRazorpaySignature(orderId, paymentId, signature, ''), false);
});
