import { useState } from 'react';
import { canCollectCash, formatMoney } from '../../lib/booking';
import { processBooking } from '../../services/adminDataService';
import Icon from '../Icon';

export default function BookingInbox({ sales, user, onRefresh, loading }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const bookings = sales.filter((sale) => sale.bookingCode);
  const visible = bookings.filter((sale) => {
    const text = [sale.bookingCode, sale.guestName, sale.guestRoom, sale.recommendationTitle].join(' ').toLowerCase();
    return text.includes(search.trim().toLowerCase()) &&
      (filter === 'all' || (filter === 'paid' ? sale.status === 'Cobrado' : sale.status === 'Reservado'));
  });
  async function process(sale, action) {
    const message = action === 'confirm'
      ? `¿La empresa confirmó la fecha y el horario de ${sale.bookingCode}?`
      : action === 'collect'
        ? `¿Recibiste ${formatMoney(sale.amount)} en efectivo por ${sale.bookingCode}?`
        : `¿Cancelar la solicitud ${sale.bookingCode}?`;
    if (!window.confirm(message)) return;
    setBusy(sale.id); setError('');
    try { await processBooking(sale, action, user); await onRefresh(); }
    catch (e) { setError(e.message || 'No se pudo procesar la reserva.'); }
    finally { setBusy(null); }
  }
  return (
    <section className="booking-inbox" aria-labelledby="inbox-title">
      <header className="booking-header"><div><p className="booking-muted">Recepción</p><h2 id="inbox-title">Reservas y cupones</h2></div>
        <button className="booking-icon" type="button" onClick={onRefresh} disabled={loading || !!busy} aria-label="Actualizar reservas" title="Actualizar reservas"><Icon name="list" /></button>
      </header>
      <div className="booking-toolbar">
        <label className="booking-field"><span>Buscar reserva</span><input type="search" placeholder="Código, huésped o habitación" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <label className="booking-field"><span>Mostrar</span><select aria-label="Mostrar" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="pending">Pendientes de cobro</option><option value="paid">Cobradas</option><option value="all">Todas</option></select></label>
      </div>
      {error && <p className="booking-error" role="alert">{error}</p>}
      {loading ? <p role="status">Cargando reservas...</p> : visible.length === 0 ? <p className="booking-muted">No hay reservas para esta búsqueda.</p> : visible.map((sale) => {
        const expired = new Date(sale.expiresAt) <= new Date();
        const pending = sale.status === 'Reservado';
        return <article className="booking-row" key={sale.id}>
          <div className="booking-row-title"><div><strong>{sale.bookingCode}</strong><h3>{sale.recommendationTitle}</h3></div><strong>{formatMoney(sale.amount)}</strong></div>
          <p>{sale.guestName} · Hab. {sale.guestRoom || '-'} · {sale.quantity} unidad(es)</p>
          <p className="booking-muted">{sale.serviceDate} · {sale.serviceTime}{sale.endDate ? ` hasta ${sale.endDate} · ${sale.endTime}` : ''}</p>
          <p className="booking-muted">{sale.guestContact}{sale.pickupLocation ? ` · ${sale.pickupLocation}` : ''}</p>
          <div className="booking-row-status"><span>{sale.bookingStatus}</span><span>{sale.status === 'Cobrado' ? 'Efectivo recibido' : sale.status === 'Anulado' ? 'Anulada' : expired ? 'Cupón vencido' : 'Pago pendiente'}</span></div>
          <p className="booking-muted">Empresa {formatMoney(sale.providerAmount)} · Recepción {formatMoney(sale.receptionistCommission)} · Sistema {formatMoney(sale.systemCommission)}</p>
          {sale.paidAt && <p className="booking-muted">Cobró {sale.collectedBy} · {new Date(sale.paidAt).toLocaleString('es-ES')}</p>}
          {pending && <div className="booking-row-actions">
            {sale.bookingStatus === 'Solicitada' && !expired && <button className="booking-secondary" type="button" disabled={!!busy} onClick={() => process(sale, 'confirm')}><Icon name="check" /> Confirmar disponibilidad</button>}
            {canCollectCash(sale) && <button className="booking-primary" type="button" disabled={!!busy} onClick={() => process(sale, 'collect')}><Icon name="coins" /> Recibir {formatMoney(sale.amount)}</button>}
            <button className="booking-icon" type="button" title="Cancelar solicitud" aria-label={`Cancelar ${sale.bookingCode}`} disabled={!!busy} onClick={() => process(sale, 'cancel')}><Icon name="x" /></button>
          </div>}
        </article>;
      })}
    </section>
  );
}
