import { useEffect, useState } from 'react';
import Icon from './Icon';

// Checkout simple para el huésped: ve el servicio y paga desde su teléfono.
// Nunca se muestra la comisión (es interna del recepcionista).
export default function CheckoutModal({ rec, onClose, onConfirm, autoCharge = false }) {
  const [form, setForm] = useState({ guestName: '', guestRoom: '', quantity: 1 });
  const [status, setStatus] = useState('form'); // 'form' | 'saving' | 'done'

  const quantity = Math.max(1, Number(form.quantity) || 1);
  const total = (Number(rec.price) || 0) * quantity;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handlePay(event) {
    event.preventDefault();
    setStatus('saving');
    try {
      await onConfirm({
        guestName: form.guestName,
        guestRoom: form.guestRoom,
        quantity,
        amount: total,
      });
    } catch {
      // El registro es best-effort; igual dejamos pagar al huésped.
    }
    if (rec.paymentUrl) {
      window.open(rec.paymentUrl, '_blank', 'noopener,noreferrer');
    }
    setStatus('done');
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[#1a1210]/70 p-0 md:items-center md:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-content flex w-full flex-col overflow-hidden rounded-t-[32px] border border-white/70 bg-white shadow-[0_-18px_70px_rgba(26,18,16,0.20)] md:max-w-md md:rounded-[32px]">
        <div className="flex items-center justify-between gap-4 border-b border-[#ece0cc] p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a877a]">
              Reservar y pagar
            </p>
            <h2 className="mt-1 truncate font-display text-xl font-semibold text-[#2a1d18]">
              {rec.title}
            </h2>
          </div>
          <button
            aria-label="Cerrar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3e7d2] text-[#6e1f2c]"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {status === 'done' ? (
          <div className="p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f4ea] text-[#356b48]">
              <Icon name="check" size={26} />
            </span>
            <h3 className="mt-4 font-display text-2xl font-semibold text-[#2a1d18]">
              {autoCharge ? '¡Reserva confirmada!' : '¡Reserva registrada!'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7c6a5e]">
              {autoCharge
                ? rec.paymentUrl
                  ? 'Te llevamos al pago. Al completarlo, tu reserva queda confirmada automáticamente.'
                  : 'Tu reserva quedó confirmada. ¡Te esperamos!'
                : 'Tu pedido llegó a la recepción del hotel. Te van a contactar para coordinar y cobrar.'}
            </p>
            <button
              className="mt-6 w-full rounded-full bg-[#6e1f2c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#561420]"
              onClick={onClose}
              type="button"
            >
              Listo
            </button>
          </div>
        ) : (
          <form className="p-5 sm:p-6" onSubmit={handlePay}>
            <div className="flex items-center justify-between rounded-[20px] border border-[#ece0cc] bg-[#fbf5ea] px-4 py-3">
              <span className="text-sm font-medium text-[#7c6a5e]">
                {rec.provider || 'Servicio del hotel'}
              </span>
              <span className="font-display text-lg font-semibold text-[#2a1d18]">€{rec.price}</span>
            </div>

            <div className="mt-4 grid gap-4">
              <Field
                label="Tu nombre"
                onChange={(value) => update('guestName', value)}
                required
                value={form.guestName}
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Habitación"
                  onChange={(value) => update('guestRoom', value)}
                  value={form.guestRoom}
                />
                <Field
                  label="Cantidad"
                  onChange={(value) => update('quantity', value)}
                  type="number"
                  value={form.quantity}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-[20px] bg-[#1a1210] px-5 py-4 text-[#ecca80]">
              <span className="text-sm font-semibold uppercase tracking-[0.14em]">Total</span>
              <span className="font-display text-2xl font-bold">€{total}</span>
            </div>

            <button
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#7d2230_0%,#6e1f2c_50%,#581522_100%)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(94,26,42,0.28)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              disabled={status === 'saving'}
              type="submit"
            >
              {status === 'saving' ? 'Procesando…' : `Pagar €${total}`}
              {status !== 'saving' && <Icon name="arrowRight" size={16} />}
            </button>
            <p className="mt-3 text-center text-xs text-[#9a877a]">
              Pago seguro · Reserva coordinada por la recepción del hotel
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, onChange, required = false, type = 'text', value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#9a877a]">
        {label}
      </span>
      <input
        className="h-12 w-full rounded-full border border-[#e6d7bf] bg-white px-4 text-sm font-medium text-[#2a1d18] outline-none transition focus:border-[#c49a3f] focus:ring-4 focus:ring-[#e7cf9b]/70"
        min={type === 'number' ? 1 : undefined}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}
