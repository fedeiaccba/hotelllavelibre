import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { formatMoney } from '../src/lib/booking.js';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const base = process.env.TEST_URL || 'http://127.0.0.1:5175';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const shot = (name) => page.screenshot({ path: path.join(process.env.TEMP || '.', `reception-${name}.png`), fullPage: true });
await page.route('https://*.supabase.co/**', (route) => route.abort());
try {
  await page.goto(base);
  await page.getByText('Catálogo de demostración', { exact: false }).waitFor();
  await page.evaluate(() => {
    localStorage.setItem('gringacho_admin_session', JSON.stringify({ id: 2, name: 'Recepción de prueba', role: 'hotel_admin', hotelId: 101 }));
    const common = { hotelId: 101, guestName: 'Ana García Fernández', guestRoom: '204', guestContact: 'ana@example.com', quantity: 2,
      recommendationTitle: 'Gruta de Benagil en barco y paseo por los acantilados del Algarve',
      amount: 120, providerAmount: 80, receptionistCommission: 20, systemCommission: 20,
      serviceDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), serviceTime: '10:00:00',
      expiresAt: new Date(Date.now() + 43200000).toISOString(), createdAt: new Date().toISOString(),
      status: 'Reservado', paymentMethod: 'cash', bookingStatus: 'Solicitada', pickupLocation: 'Recepción del hotel' };
    localStorage.setItem('gringacho_sales', JSON.stringify([
      { ...common, id: 'request', bookingCode: 'LL-12345678901234567890123456789012' },
      { ...common, id: 'request-cancel', bookingCode: 'LL-CANCEL', guestName: 'Pedro Ruiz', guestRoom: '301' },
      { ...common, id: 'ready', bookingCode: 'LL-READY', guestName: 'Laura López', guestRoom: '118', quantity: 1, amount: 60, providerAmount: 40, receptionistCommission: 10, systemCommission: 10, bookingStatus: 'Confirmada' },
      { ...common, id: 'paid', bookingCode: 'LL-PAID', guestName: 'Mario Pérez', status: 'Cobrado', amount: 80, providerAmount: 60, receptionistCommission: 10, systemCommission: 10, paidAt: new Date().toISOString(), collectedBy: 'Recepción de prueba', bookingStatus: 'Confirmada' },
      { ...common, id: 'expired', bookingCode: 'LL-EXPIRED', guestName: 'Elena Díaz', expiresAt: '2020-01-01T00:00:00Z' },
      { ...common, id: 'cancelled', bookingCode: 'LL-CANCELLED', status: 'Anulado', bookingStatus: 'Cancelada' },
      { id: 'legacy', hotelId: 101, guestName: 'Registro anterior', recommendationTitle: 'Traslado', amount: 55, commission: 12, status: 'Liquidado', createdAt: '2020-01-01T12:00:00Z' },
      { ...common, id: 'foreign', hotelId: 102, bookingCode: 'LL-OTHER-HOTEL', guestName: 'Otro hotel', status: 'Cobrado', paidAt: new Date().toISOString() },
    ]));
  });
  await page.goto(`${base}/admin`);
  await page.getByRole('heading', { name: 'Reservas', exact: true }).waitFor();
  assert.equal(await page.getByRole('tab').count(), 3);
  for (const label of ['Schema listo', 'Nuevo servicio', 'Editar datos', 'Crear acceso']) assert.equal(await page.getByRole('button', { name: label, exact: true }).count(), 0);
  await shot('reservations-desktop');
  await page.getByLabel('Buscar reserva', { exact: true }).fill('204');
  await page.getByText('Ver detalle', { exact: true }).click();
  await page.getByText('ana@example.com', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Confirmar disponibilidad', exact: true }).click();
  let dialog = page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: 'Volver', exact: true }).click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gringacho_sales')).find((s) => s.id === 'request').bookingStatus), 'Solicitada');
  await page.getByRole('button', { name: 'Confirmar disponibilidad', exact: true }).click();
  await dialog.getByRole('button', { name: 'Sí, la empresa confirmó', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Disponibilidad confirmada.' }).waitFor();
  await page.getByLabel('Estado', { exact: true }).selectOption('ready');
  await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar efectivo recibido', exact: true }).click();
  await dialog.getByText(formatMoney(120), { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  await page.getByRole('button', { name: 'Registrar efectivo recibido', exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let fail = true;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'gringacho_sales' && fail) { fail = false; throw new Error('No se pudo registrar el cobro. Intentá nuevamente.'); }
      return original.call(this, key, value);
    };
  });
  await dialog.getByRole('button', { name: 'Sí, recibí el efectivo', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gringacho_sales')).find((s) => s.id === 'request').status), 'Reservado');
  await dialog.getByRole('button', { name: 'Sí, recibí el efectivo', exact: true }).click();
  await page.getByText('Este cupón ya está cobrado.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Registrar efectivo recibido', exact: true }).count(), 0);
  await shot('collect-desktop');
  await page.getByRole('tab', { name: 'Caja y comisiones', exact: true }).click();
  assert.deepEqual(await page.locator('.reception-totals dd').allTextContents(), [200, 140, 30, 30].map(formatMoney));
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar cobros', exact: true }).click();
  const download = await downloadEvent;
  const csv = await readFile(await download.path(), 'utf8');
  assert.ok(csv.includes('Ana García Fernández')); assert.equal(csv.includes('Otro hotel'), false);
  await shot('cash-desktop');
  await page.getByLabel('Período', { exact: true }).selectOption('all');
  assert.deepEqual(await page.locator('.reception-totals dd').allTextContents(), [255, 183, 42, 30].map(formatMoney));
  await page.getByLabel('Período', { exact: true }).selectOption('custom');
  await page.getByText('Elegí una fecha de inicio', { exact: false }).waitFor();
  await page.getByLabel('Desde', { exact: true }).fill('2020-01-01');
  await page.getByLabel('Hasta', { exact: true }).fill('2020-01-01');
  assert.equal(await page.locator('.reception-totals dd').first().textContent(), formatMoney(55));
  await page.getByRole('tab', { name: /^Reservas/ }).click();
  await page.getByLabel('Buscar reserva', { exact: true }).fill('Pedro');
  await page.getByLabel('Estado', { exact: true }).selectOption('requested');
  await page.getByText('Ver detalle', { exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar reserva', exact: true }).click();
  await dialog.getByRole('button', { name: 'Sí, cancelar reserva', exact: true }).click();
  await page.getByLabel('Estado', { exact: true }).selectOption('cancelled');
  await page.getByText('Pedro Ruiz', { exact: true }).waitFor();
  await page.getByRole('tab', { name: /^Cobrar/ }).click();
  await page.getByLabel('Buscar cupón o huésped', { exact: true }).fill('LL-EXPIRED');
  await page.getByText('El cupón venció.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Registrar efectivo recibido', exact: true }).count(), 0);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of [/^Reservas/, /^Cobrar/, /^Caja y comisiones/]) {
      await page.getByRole('tab', { name: tab }).click();
      if (tab.source.includes('Reservas')) { await page.getByLabel('Estado', { exact: true }).selectOption('all'); await page.getByLabel('Buscar reserva', { exact: true }).fill(''); }
      if (tab.source.includes('Cobrar')) await page.getByLabel('Buscar cupón o huésped', { exact: true }).fill('LL-READY');
      if (tab.source.includes('Caja')) await page.getByLabel('Período', { exact: true }).selectOption('today');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const box of await page.locator('.reception-dashboard button, .reception-dashboard input, .reception-dashboard select').evaluateAll((nodes) => nodes.filter((n) => n.getClientRects().length).map((n) => ({ right: n.getBoundingClientRect().right, left: n.getBoundingClientRect().left })))) {
        assert.ok(box.right <= width + 1 && box.left >= -1, `Control outside ${width}px viewport`);
      }
      await shot(`${tab.source.replaceAll(/[^a-z]/gi, '')}-${width}`);
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 3 reception views, confirm/cancel, failed cash retry, duplicate prevention, totals, export, dates, tenant scope and 320/390px screenshots.');
} finally { await browser.close(); }
