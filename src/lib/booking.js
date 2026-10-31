export const isRental = (item) => ['alquiler-auto', 'alquiler-moto'].includes(item.category);

export function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const cents = (value) => Math.round(Number(value) * 100);

export function quoteBooking(item, form) {
  const quantity = Number(form.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    throw new Error('La cantidad debe ser un entero entre 1 y 50.');
  }
  let days = 1;
  if (isRental(item)) {
    const start = Date.parse(`${form.serviceDate}T${form.serviceTime}:00Z`);
    const end = Date.parse(`${form.endDate}T${form.endTime}:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new Error('La devolución debe ser posterior a la entrega.');
    }
    days = Math.ceil((end - start) / 86400000);
  }
  const reception = cents(item.receptionistCommission ?? item.commission ?? 0);
  const system = cents(item.systemCommission ?? 0);
  const price = cents(item.price);
  const provider = item.providerCost === '' || item.providerCost == null
    ? price - reception - system : cents(item.providerCost);
  if ([price, provider, reception, system].some((v) => !Number.isFinite(v) || v < 0) ||
    price <= 0 || provider + reception + system !== price) {
    throw new Error('La tarifa de este servicio necesita revisión. Contactá a recepción.');
  }
  const units = quantity * days;
  return { quantity, days, amount: price * units / 100, providerAmount: provider * units / 100,
    receptionistCommission: reception * units / 100, systemCommission: system * units / 100,
    commission: (reception + system) * units / 100 };
}

export function validateBooking(form) {
  if (!form.guestName?.trim() || !form.guestContact?.trim()) {
    throw new Error('Completá tu nombre y un teléfono o email de contacto.');
  }
  const start = new Date(`${form.serviceDate}T${form.serviceTime}`);
  if (!Number.isFinite(start.getTime()) || start <= new Date()) {
    throw new Error('Elegí una fecha y hora futuras.');
  }
  return start;
}

export function canCollectCash(sale, now = Date.now()) {
  return sale.paymentMethod === 'cash' && sale.bookingStatus === 'Confirmada' &&
    sale.status === 'Reservado' && Boolean(sale.expiresAt) &&
    new Date(sale.expiresAt).getTime() > now;
}

export function formatMoney(value) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value || 0);
}
