import { useEffect, useRef, useState } from 'react';
import { formatMoney, isRental, localToday, quoteBooking, validateBooking } from '../lib/booking';
import BookingReceipt from './BookingReceipt';
import Icon from './Icon';

export default function CheckoutModal({ rec, hotel, onClose, onConfirm }) {
  const rental = isRental(rec);
  const [form, setForm] = useState({ guestName: '', guestRoom: '', guestContact: '', quantity: 1,
    serviceDate: '', serviceTime: '', endDate: '', endTime: '', pickupLocation: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sale, setSale] = useState(null);
  const submitting = useRef(false);
  const panel = useRef(null);
  const requestId = useRef(crypto.randomUUID());
  let quote;
  try { quote = quoteBooking(rec, form); } catch { /* Dates may still be incomplete. */ }

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape' && !submitting.current) onClose();
      if (event.key === 'Tab') {
        const elements = panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]');
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }
    };
    window.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true); setError('');
    try {
      validateBooking(form);
      const amounts = quoteBooking(rec, form);
      const created = await onConfirm({ ...form, ...amounts, requestId: requestId.current });
      if (!created?.bookingCode) throw new Error('No se pudo generar el cupón. Volvé a intentarlo.');
      setSale(created);
    } catch (currentError) {
      setError(currentError.code ? 'No se pudo registrar la solicitud. Contactá a recepción o intentá más tarde.' : currentError.message || 'No se pudo guardar la solicitud. Volvé a intentarlo.');
    } finally { submitting.current = false; setSaving(false); }
  }

  return (
    <div className="booking-backdrop" onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div ref={panel} tabIndex={-1} className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <header className="booking-header">
          <div><p className="booking-muted">{rec.provider || 'Solicitud al proveedor'}</p><h2 id="booking-title">{rec.title}</h2></div>
          <button className="booking-icon" type="button" aria-label="Cerrar" title="Cerrar" disabled={saving} onClick={onClose}><Icon name="x" /></button>
        </header>
        {sale ? <BookingReceipt sale={sale} hotelName={hotel?.name} /> : (
          <form className="booking-form" onSubmit={submit}>
            <p className="booking-notice">Fecha y horario sujetos a confirmación de la empresa.</p>
            <div className="booking-grid">
              <Field label="Tu nombre" value={form.guestName} onChange={(v) => update('guestName', v)} required />
              <Field label="Habitación" value={form.guestRoom} onChange={(v) => update('guestRoom', v)} />
              <Field label="Teléfono o email" value={form.guestContact} onChange={(v) => update('guestContact', v)} required />
              <Field label={rental || rec.category === 'taxi' ? 'Vehículos' : 'Personas'} type="number" min="1" max="50" step="1" value={form.quantity} onChange={(v) => update('quantity', v)} required />
              <Field label={rental ? 'Fecha de entrega' : 'Fecha solicitada'} type="date" min={localToday()} value={form.serviceDate} onChange={(v) => update('serviceDate', v)} required />
              <Field label={rental ? 'Hora de entrega' : 'Hora solicitada'} type="time" value={form.serviceTime} onChange={(v) => update('serviceTime', v)} required />
              {rental && <>
                <Field label="Fecha de devolución" type="date" min={form.serviceDate || localToday()} value={form.endDate} onChange={(v) => update('endDate', v)} required />
                <Field label="Hora de devolución" type="time" value={form.endTime} onChange={(v) => update('endTime', v)} required />
              </>}
            </div>
            <Field label={rental ? 'Lugar de entrega solicitado' : 'Punto de recogida solicitado'} value={form.pickupLocation} onChange={(v) => update('pickupLocation', v)} placeholder={hotel?.name || rec.location} />
            <fieldset className="booking-payment"><legend>Forma de pago</legend>
              <label><input type="radio" name="paymentMethod" value="cash" checked readOnly /> Efectivo en recepción</label>
              <label className="booking-muted"><input type="radio" name="paymentMethod" disabled /> Pago online (próximamente)</label>
            </fieldset>
            <div className="booking-total"><span>{rental && quote ? `${quote.days} día(s) · ${form.quantity} vehículo(s)` : 'Total pendiente'}</span><strong>{quote ? formatMoney(quote.amount) : 'Completá las fechas'}</strong></div>
            {error && <p role="alert" className="booking-error">{error}</p>}
            <button className="booking-primary" type="submit" disabled={saving}>{saving ? 'Guardando solicitud...' : 'Solicitar reserva y generar cupón'}<Icon name="ticket" /></button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, onChange, ...props }) {
  return <label className="booking-field"><span>{label}</span><input {...props} onChange={(event) => onChange(event.target.value)} /></label>;
}
