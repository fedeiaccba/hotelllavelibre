import test from 'node:test';
import assert from 'node:assert/strict';
import { cashSummary, exportCashCsv, hotelDay, matchesBooking, reservationState } from '../src/lib/reception.js';

test('states distinguish expired unpaid coupons from historical paid bookings', () => {
  const now = Date.parse('2026-11-03T12:00:00Z');
  const base = { status: 'Reservado', bookingStatus: 'Solicitada', expiresAt: '2026-11-04T00:00:00Z' };
  assert.equal(reservationState(base, now), 'requested');
  assert.equal(reservationState({ ...base, bookingStatus: 'Confirmada' }, now), 'ready');
  assert.equal(reservationState({ ...base, expiresAt: 'invalid' }, now), 'expired');
  assert.equal(reservationState({ ...base, expiresAt: '2020-01-01', status: 'Cobrado' }, now), 'paid');
  assert.equal(reservationState({ ...base, bookingStatus: 'Cancelada' }, now), 'cancelled');
});
test('search supports guest, room and case-insensitive coupon', () => {
  const sale = { bookingCode: 'LL-ABC123', guestName: 'Ana García', guestRoom: '204' };
  for (const query of [' ana ', '204', 'll-abc']) assert.equal(matchesBooking(sale, query), true);
  assert.equal(matchesBooking(sale, '305'), false);
});
test('cash only counts collected amounts and uses payment date in hotel timezone', () => {
  const sale = { id: 1, status: 'Cobrado', paidAt: '2026-07-01T23:30:00Z', createdAt: '2026-06-30T12:00:00Z',
    amount: 60.10, providerAmount: 40.10, receptionistCommission: 10, systemCommission: 10 };
  assert.equal(hotelDay(sale.paidAt, 'Europe/Lisbon'), '2026-07-02');
  const result = cashSummary([sale, { ...sale, status: 'Reservado' }, { ...sale, status: 'Anulado' }], '2026-07-02', '2026-07-02');
  assert.equal(result.rows.length, 1); assert.equal(result.total, 60.10);
  assert.equal(result.provider, 40.10); assert.equal(result.reception, 10); assert.equal(result.system, 10);
  assert.equal(cashSummary([sale], '2026-07-01', '2026-07-01').total, 0);
});
test('cash supports previous records and sums cents without floating drift', () => {
  const records = Array.from({ length: 3 }, () => ({ status: 'Liquidado', amount: 0.10, commission: 0.02, createdAt: '2026-11-03' }));
  const result = cashSummary(records);
  assert.equal(result.total, 0.3); assert.equal(result.reception, 0.06); assert.equal(result.provider, 0.24);
});
test('CSV quotes names and neutralizes spreadsheet formulas', () => {
  const csv = exportCashCsv([{ guestName: '=SUM(1,2)', guestRoom: '204', collectedBy: 'Test "Name"', amount: 60 }]);
  assert.ok(csv.includes('"\'=SUM(1,2)"')); assert.ok(csv.includes('"Test ""Name"""')); assert.ok(csv.includes('"60"'));
});
