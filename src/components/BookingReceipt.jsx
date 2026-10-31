import { formatMoney } from '../lib/booking';
import Icon from './Icon';

export default function BookingReceipt({ sale, hotelName }) {
  function download() {
    const content = [
      'LlaveLibre - Cupón de solicitud', sale.bookingCode, sale.recommendationTitle,
      `Hotel: ${hotelName || '-'}`, `Huésped: ${sale.guestName}`,
      `Fecha solicitada: ${sale.serviceDate} ${sale.serviceTime}`,
      sale.endDate ? `Devolución: ${sale.endDate} ${sale.endTime}` : '',
      `Cantidad: ${sale.quantity}`, `Total pendiente: ${formatMoney(sale.amount)}`,
      'Pago en efectivo en recepción. Disponibilidad pendiente de confirmación.',
      `Vencimiento del cupón: ${new Date(sale.expiresAt).toLocaleString('es-ES')}`,
      'Este cupón no acredita pago ni garantiza una plaza. Recepción consulta el estado vigente.',
    ].filter(Boolean).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${sale.bookingCode}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="booking-receipt" aria-label="Cupón de reserva">
      <p className="booking-status">Solicitud registrada · Sin pagar</p>
      <h3>Tu cupón para recepción</h3>
      <p className="booking-code">{sale.bookingCode}</p>
      <dl className="booking-summary">
        <div><dt>Servicio</dt><dd>{sale.recommendationTitle}</dd></div>
        <div><dt>Hotel</dt><dd>{hotelName}</dd></div>
        <div><dt>Huésped</dt><dd>{sale.guestName}</dd></div>
        <div><dt>Fecha solicitada</dt><dd>{sale.serviceDate} · {sale.serviceTime}</dd></div>
        {sale.endDate && <div><dt>Devolución</dt><dd>{sale.endDate} · {sale.endTime}</dd></div>}
        <div><dt>Cantidad</dt><dd>{sale.quantity}</dd></div>
        <div><dt>Total pendiente</dt><dd>{formatMoney(sale.amount)}</dd></div>
      </dl>
      <p className="booking-notice">La empresa debe confirmar la disponibilidad. Este cupón no acredita pago ni garantiza una plaza.</p>
      <p className="booking-muted">Vence: {new Date(sale.expiresAt).toLocaleString('es-ES')}. Presentalo en recepción para consultar el estado y pagar en efectivo.</p>
      <button className="booking-primary" type="button" onClick={download}><Icon name="ticket" /> Descargar cupón</button>
    </section>
  );
}
