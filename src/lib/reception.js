export function hotelDay(value = new Date(), timeZone = 'Europe/Lisbon') {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function reservationState(sale, now = Date.now()) {
  if (sale.status === 'Anulado' || sale.bookingStatus === 'Cancelada') return 'cancelled';
  if (['Cobrado', 'Liquidado'].includes(sale.status)) return 'paid';
  const expiry = new Date(sale.expiresAt).getTime();
  if (!sale.expiresAt || !Number.isFinite(expiry) || expiry <= now) return 'expired';
  return sale.bookingStatus === 'Confirmada' ? 'ready' : 'requested';
}

export const STATE_LABELS = { requested: 'Por confirmar', ready: 'Lista para cobrar', paid: 'Cobrada', expired: 'Cupón vencido', cancelled: 'Cancelada' };

export function formatServiceDate(value) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date) : 'Fecha sin indicar';
}

export function matchesBooking(sale, search) {
  const query = search.trim().toLocaleLowerCase();
  return [sale.bookingCode, sale.guestName, sale.guestRoom, sale.recommendationTitle]
    .some((value) => String(value || '').toLocaleLowerCase().includes(query));
}

export function cashSummary(sales, from = '', to = '', timeZone = 'Europe/Lisbon') {
  const rows = sales.filter((sale) => {
    if (!['Cobrado', 'Liquidado'].includes(sale.status)) return false;
    const day = hotelDay(sale.paidAt || sale.createdAt, timeZone);
    return (!from && !to) || (day && (!from || day >= from) && (!to || day <= to));
  }).sort((a, b) => String(b.paidAt || b.createdAt || '').localeCompare(String(a.paidAt || a.createdAt || '')));
  const cents = rows.reduce((acc, sale) => {
    const reception = Number(sale.receptionistCommission ?? sale.commission) || 0;
    const system = Number(sale.systemCommission) || 0;
    const total = Number(sale.amount) || 0;
    const provider = sale.providerAmount == null ? total - reception - system : Number(sale.providerAmount);
    for (const [key, value] of Object.entries({ total, reception, system, provider })) acc[key] += Math.round(value * 100);
    return acc;
  }, { total: 0, reception: 0, system: 0, provider: 0 });
  return { rows, ...Object.fromEntries(Object.entries(cents).map(([key, value]) => [key, value / 100])) };
}

export function exportCashCsv(rows) {
  const cell = (value) => {
    let text = String(value ?? '');
    if (typeof value !== 'number' && /^[=+@\-\t\r\n]/.test(text.trimStart())) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const header = ['Fecha', 'Cupón', 'Huésped', 'Habitación', 'Total EUR', 'Empresa EUR', 'Recepción EUR', 'Sistema EUR', 'Cobró'];
  return '\uFEFF' + [header, ...rows.map((sale) => [sale.paidAt || sale.createdAt || '', sale.bookingCode || '',
    sale.guestName, sale.guestRoom, Number(sale.amount) || 0,
    sale.providerAmount == null ? (Number(sale.amount) || 0) - (Number(sale.receptionistCommission ?? sale.commission) || 0) - (Number(sale.systemCommission) || 0) : Number(sale.providerAmount),
    Number(sale.receptionistCommission ?? sale.commission) || 0, Number(sale.systemCommission) || 0, sale.collectedBy || sale.receptionistName || ''])]
    .map((row) => row.map(cell).join(';')).join('\r\n');
}
