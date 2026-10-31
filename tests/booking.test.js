import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteBooking, canCollectCash, validateBooking } from '../src/lib/booking.js';

const excursion = { category: 'excursion', price: 60, providerCost: 40, receptionistCommission: 10, systemCommission: 10 };

test('two guests preserve the complete 40/10/10 split', () => {
  assert.deepEqual(quoteBooking(excursion, { quantity: 2 }), {
    quantity: 2, days: 1, amount: 120, providerAmount: 80,
    receptionistCommission: 20, systemCommission: 20, commission: 40,
  });
});
test('rental bills each started 24-hour period and vehicle', () => {
  const quote = quoteBooking({ ...excursion, category: 'alquiler-auto' }, {
    quantity: 2, serviceDate: '2030-03-01', serviceTime: '10:00', endDate: '2030-03-03', endTime: '10:01',
  });
  assert.equal(quote.days, 3); assert.equal(quote.amount, 360);
});
test('invalid quantities, negative parts and mismatched totals are rejected', () => {
  for (const quantity of [0, -1, 1.5, 51]) assert.throws(() => quoteBooking(excursion, { quantity }));
  assert.throws(() => quoteBooking({ ...excursion, providerCost: 41 }, { quantity: 1 }));
  assert.throws(() => quoteBooking({ ...excursion, systemCommission: -1 }, { quantity: 1 }));
});
test('zero provider cost is valid and is not replaced by a fallback', () => {
  assert.equal(quoteBooking({ ...excursion, price: 20, providerCost: 0 }, { quantity: 1 }).providerAmount, 0);
});
test('legacy commission belongs to reception and decimal money reconciles', () => {
  const quote = quoteBooking({ price: 10.10, commission: 2.05 }, { quantity: 3 });
  assert.equal(quote.amount, 30.3); assert.equal(quote.receptionistCommission, 6.15);
  assert.equal(quote.providerAmount, 24.15);
});
test('only confirmed, unexpired and unpaid cash coupons can be collected', () => {
  const sale = { paymentMethod: 'cash', bookingStatus: 'Confirmada', status: 'Reservado', expiresAt: '2030-01-02T00:00:00Z' };
  const now = Date.parse('2030-01-01T00:00:00Z');
  assert.equal(canCollectCash(sale, now), true);
  for (const change of [{ status: 'Cobrado' }, { bookingStatus: 'Solicitada' }, { bookingStatus: 'Cancelada' }, { paymentMethod: 'online' }, { expiresAt: '2029-01-01' }]) {
    assert.equal(canCollectCash({ ...sale, ...change }, now), false);
  }
});
test('past service dates and missing contact are rejected', () => {
  assert.throws(() => validateBooking({ guestName: 'Ana', guestContact: 'ana@example.com', serviceDate: '2020-01-01', serviceTime: '10:00' }));
  assert.throws(() => validateBooking({ guestName: 'Ana', serviceDate: '2030-01-01', serviceTime: '10:00' }));
});
