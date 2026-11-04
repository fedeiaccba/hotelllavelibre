import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { listHotels, listSales, processBooking } from '../../services/adminDataService';
import { signOutAdmin } from '../../services/authService';
import { canCollectCash, formatMoney } from '../../lib/booking';
import { cashSummary, exportCashCsv, formatServiceDate, hotelDay, matchesBooking, reservationState, STATE_LABELS } from '../../lib/reception';
import BrandMark from '../BrandMark';
import Icon from '../Icon';
import './ReceptionDashboard.css';

const TABS = [{ id: 'reservations', label: 'Reservas', icon: 'calendar' },
  { id: 'collect', label: 'Cobrar', icon: 'coins' }, { id: 'cash', label: 'Caja y comisiones', icon: 'chart' }];

export default function ReceptionDashboard({ user }) {
  const [hotel, setHotel] = useState(null);
  const [sales, setSales] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('reservations');
  const [search, setSearch] = useState('');
  const [collectSearch, setCollectSearch] = useState('');
  const [filter, setFilter] = useState('requested');
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [range, setRange] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const alive = useRef(true);
  const revision = useRef(0);
  const actionLock = useRef(false);
  const tabRefs = useRef([]);

  const refresh = useCallback(async () => {
    const current = ++revision.current;
    setLoading(true);
    try {
      const [hotels, records] = await Promise.all([listHotels(), listSales()]);
      if (!alive.current || current !== revision.current) return;
      const assigned = hotels.find((item) => String(item.id) === String(user.hotelId));
      if (!assigned) throw new Error('Tu cuenta no tiene un hotel disponible. Contactá al administrador.');
      setHotel(assigned);
      setSales(records.filter((item) => String(item.hotelId) === String(user.hotelId)));
      setLoaded(true); setLoadError(''); setNow(Date.now());
    } catch (error) {
      if (alive.current && current === revision.current) setLoadError(error.code ? 'No se pudieron actualizar las reservas. Revisá la conexión o volvé a ingresar.' : error.message || 'No se pudieron actualizar las reservas.');
    } finally { if (alive.current && current === revision.current) setLoading(false); }
  }, [user.hotelId]);

  useEffect(() => {
    alive.current = true;
    void Promise.resolve().then(() => { if (alive.current) void refresh(); });
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !actionLock.current) void refresh();
    }, 30000);
    return () => { alive.current = false; revision.current += 1; clearInterval(interval); };
  }, [refresh]);

  const bookings = sales.filter((sale) => sale.bookingCode);
  const pending = bookings.filter((sale) => reservationState(sale, now) === 'requested').length;
  const ready = bookings.filter((sale) => canCollectCash(sale, now)).length;
  const reservations = bookings.filter((sale) => matchesBooking(sale, search) &&
    (filter === 'all' || reservationState(sale, now) === filter))
    .sort((a, b) => `${a.serviceDate} ${a.serviceTime}`.localeCompare(`${b.serviceDate} ${b.serviceTime}`));
  const payable = bookings.filter((sale) => collectSearch.trim() ? matchesBooking(sale, collectSearch) : canCollectCash(sale, now));
  const today = hotelDay(new Date(now), hotel?.timeZone);
  const week = new Date(`${today}T12:00:00Z`); week.setUTCDate(week.getUTCDate() - 6);
  const from = range === 'today' ? today : range === 'week' ? week.toISOString().slice(0, 10) : range === 'custom' ? customFrom : '';
  const to = range === 'all' ? '' : range === 'custom' ? customTo : today;
  const invalidRange = range === 'custom' && (!from || !to || from > to);
  const cash = cashSummary(invalidRange ? [] : sales, from, to, hotel?.timeZone);

  function openDialog(sale, action) { setActionError(''); setDialog({ sale, action }); }
  function goCollect(sale) { setCollectSearch(sale.bookingCode); setTab('collect'); setNotice(''); }
  async function confirmAction() {
    if (!dialog || actionLock.current) return;
    actionLock.current = true; setBusy(true); setActionError('');
    try {
      const updated = await processBooking(dialog.sale, dialog.action, user);
      if (!alive.current) return;
      revision.current += 1;
      setLoading(false);
      setSales((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(dialog.action === 'collect' ? `Cobro registrado: ${formatMoney(updated.amount)}. Cupón ${updated.bookingCode}.`
        : dialog.action === 'confirm' ? `Disponibilidad confirmada. Cupón ${updated.bookingCode}.` : `Reserva cancelada. Cupón ${updated.bookingCode}.`);
      setDialog(null); setNow(Date.now());
    } catch (error) {
      setActionError(error.code === '42501' ? 'Tu cuenta ya no tiene permiso para esta operación. Volvé a ingresar.'
        : error.code && error.code !== '22023' ? 'No se pudo registrar la operación. Revisá la conexión y volvé a intentarlo.'
          : error.message || 'No se pudo registrar la operación.');
    } finally { actionLock.current = false; if (alive.current) setBusy(false); }
  }
  async function logout() {
    try { await signOutAdmin(); window.location.href = '/admin/login'; }
    catch { setLoadError('No se pudo cerrar la sesión. Volvé a intentarlo.'); }
  }
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([exportCashCsv(cash.rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `cobros-${from || 'historial'}-${to || today}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className="reception-dashboard">
    <header className="reception-topbar"><div className="reception-width reception-identity">
      <div className="reception-brand"><BrandMark /><div><h1>{hotel?.name || 'Recepción del hotel'}</h1><p>{user.name}</p></div></div>
      <div className="reception-top-actions">
        {hotel && <a className="reception-button reception-soft" href={`/h/${encodeURIComponent(hotel.slug)}`} target="_blank" rel="noopener noreferrer"><Icon name="eye" /><span>Ver catálogo</span></a>}
        <button className="reception-icon" title="Cerrar sesión" aria-label="Salir" onClick={logout} type="button"><Icon name="logOut" /></button>
      </div>
    </div></header>
    <div className="reception-width">
      <nav className="reception-tabs" role="tablist" aria-label="Gestión de recepción">{TABS.map((item, index) => <button key={item.id}
        ref={(node) => { tabRefs.current[index] = node; }} role="tab" type="button" id={`tab-${item.id}`} aria-controls={`panel-${item.id}`}
        aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => { setTab(item.id); setNotice(''); }}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
          setTab(TABS[next].id); tabRefs.current[next]?.focus();
        }}><Icon name={item.icon} /><span>{item.label}</span>{item.id !== 'cash' && <span className="reception-count">{item.id === 'reservations' ? pending : ready}</span>}</button>)}</nav>
      {loadError && <div className="reception-alert" role="alert"><span>{loadError}</span><button type="button" onClick={() => void refresh()} disabled={loading}>Reintentar</button></div>}
      {notice && <div className="reception-success" role="status"><Icon name="check" /><span>{notice}</span><button className="reception-icon" type="button" aria-label="Cerrar aviso" title="Cerrar aviso" onClick={() => setNotice('')}><Icon name="x" /></button></div>}
      {!loaded ? <p className="reception-empty" role="status">{loading ? 'Cargando el hotel y las reservas...' : 'No se pudieron cargar los datos del hotel.'}</p> : <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="reception-panel">
        <div className="reception-heading"><div><h2>{TABS.find((item) => item.id === tab).label}</h2><p>{tab === 'reservations' ? `${pending} por confirmar · ${ready} ${ready === 1 ? 'lista' : 'listas'} para cobrar` : tab === 'collect' ? 'Efectivo en recepción' : `Cobros registrados · Horario de ${hotel?.location?.split(',')[0] || 'destino'}`}</p></div>
          <button className="reception-icon" type="button" aria-label="Actualizar reservas" title="Actualizar reservas" disabled={loading || busy} onClick={() => void refresh()}><RefreshCw size={18} aria-hidden="true" /></button>
        </div>
        {tab === 'reservations' && <>
          <div className="reception-toolbar"><Field label="Buscar reserva"><input type="search" placeholder="Nombre, habitación o cupón" value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
            <Field label="Estado"><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Estado"><option value="requested">Por confirmar</option><option value="ready">Confirmadas, sin pagar</option><option value="paid">Cobradas</option><option value="expired">Vencidas</option><option value="cancelled">Canceladas</option><option value="all">Todas</option></select></Field></div>
          {reservations.length === 0 ? <Empty>{search ? 'No encontramos reservas con esos datos.' : filter === 'requested' ? 'No hay reservas pendientes de confirmar.' : 'No hay reservas en este estado.'}</Empty> : reservations.map((sale) => <Reservation key={sale.id} sale={sale} now={now} timeZone={hotel?.timeZone} onConfirm={() => openDialog(sale, 'confirm')} onCancel={() => openDialog(sale, 'cancel')} onCollect={() => goCollect(sale)} />)}
        </>}
        {tab === 'collect' && <>
          <div className="reception-toolbar reception-search"><Field label="Buscar cupón o huésped"><input type="search" placeholder="Código del cupón, nombre o habitación" value={collectSearch} onChange={(event) => setCollectSearch(event.target.value)} /></Field></div>
          {payable.length === 0 ? <Empty>{collectSearch ? 'No encontramos un cupón con esos datos.' : 'No hay reservas confirmadas pendientes de cobro.'}</Empty> : payable.map((sale) => <article className="reception-payment" key={sale.id}>
            <BookingIdentity sale={sale} now={now} />
            <div className="reception-pay-total"><span>{sale.status === 'Cobrado' || sale.status === 'Liquidado' ? 'Importe cobrado' : 'Importe a recibir'}</span><strong>{formatMoney(sale.amount)}</strong></div>
            {canCollectCash(sale, now) ? <button className="reception-button reception-primary" type="button" onClick={() => openDialog(sale, 'collect')}><Icon name="coins" /> Registrar efectivo recibido</button>
              : <div className="reception-payment-state"><p>{reservationState(sale, now) === 'paid' ? 'Este cupón ya está cobrado.' : reservationState(sale, now) === 'expired' ? 'El cupón venció. Es necesario solicitar una nueva reserva.' : reservationState(sale, now) === 'cancelled' ? 'Esta reserva está cancelada.' : 'Falta confirmar la disponibilidad con la empresa.'}</p>
                {reservationState(sale, now) === 'requested' && <button className="reception-button reception-soft" type="button" onClick={() => { setSearch(sale.bookingCode); setFilter('all'); setTab('reservations'); }}>Ver reserva</button>}</div>}
          </article>)}
        </>}
        {tab === 'cash' && <>
          <div className="reception-toolbar"><Field label="Período"><select aria-label="Período" value={range} onChange={(event) => setRange(event.target.value)}><option value="today">Hoy</option><option value="week">Últimos 7 días</option><option value="all">Todo el historial</option><option value="custom">Elegir fechas</option></select></Field>
            <button className="reception-button reception-soft" type="button" disabled={!cash.rows.length || invalidRange} onClick={exportCsv}><Download size={18} aria-hidden="true" /> Exportar cobros</button></div>
          {range === 'custom' && <div className="reception-toolbar"><Field label="Desde"><input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></Field><Field label="Hasta"><input type="date" min={customFrom} value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></Field></div>}
          {invalidRange ? <Empty>Elegí una fecha de inicio y una de fin posteriores o iguales.</Empty> : <>
            <dl className="reception-totals">{[['Cobros registrados', cash.total], ['Parte de las empresas', cash.provider], ['Comisión de recepción', cash.reception], ['Comisión del sistema', cash.system]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatMoney(value)}</dd></div>)}</dl>
            <div className="reception-ledger-heading"><h3>Historial de cobros</h3><span>{cash.rows.length} {cash.rows.length === 1 ? 'cobro' : 'cobros'}</span></div>
            {!cash.rows.length ? <Empty>No hay cobros registrados en este período.</Empty> : cash.rows.map((sale) => <article key={sale.id} className="reception-ledger-row"><div><strong>{sale.guestName || 'Huésped sin nombre'}</strong><p>{sale.recommendationTitle}</p><p>{sale.bookingCode || 'Registro anterior'} · Hab. {sale.guestRoom || '-'}</p></div><div><strong>{formatMoney(sale.amount)}</strong><p>{formatDateTime(sale.paidAt || sale.createdAt, hotel?.timeZone)}</p><p>{sale.collectedBy || sale.receptionistName || 'Recepción'}{sale.paymentMethod === 'cash' ? ' · Efectivo' : ''}</p></div></article>)}
          </>}
        </>}
      </section>}
    </div>
    {dialog && <Confirmation dialog={dialog} error={actionError} busy={busy} onCancel={() => { if (!busy) setDialog(null); }} onConfirm={confirmAction} />}
  </main>;
}

function Field({ label, children }) { return <label className="reception-field"><span>{label}</span>{children}</label>; }
function Empty({ children }) { return <p className="reception-empty">{children}</p>; }
function formatDateTime(value, timeZone = 'Europe/Lisbon') {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-ES', { timeZone, dateStyle: 'short', timeStyle: 'short' }).format(date) : 'Sin fecha de registro';
}
function BookingIdentity({ sale, now }) {
  const state = reservationState(sale, now);
  return <><div className="reception-row-title"><h3>{sale.guestName || 'Huésped sin nombre'}</h3><span className={`reception-state is-${state}`}>{STATE_LABELS[state]}</span></div>
    <p className="reception-room">Habitación {sale.guestRoom || 'sin indicar'}</p><p>{sale.recommendationTitle}</p>
    <p className="reception-muted">{formatServiceDate(sale.serviceDate)} · {sale.serviceTime?.slice(0, 5)} · Cantidad: {sale.quantity}</p>
    <p className="reception-coupon">{sale.bookingCode}</p></>;
}
function Reservation({ sale, now, timeZone, onConfirm, onCancel, onCollect }) {
  const state = reservationState(sale, now);
  return <article className="reception-reservation"><div><BookingIdentity sale={sale} now={now} />
    <details className="reception-details"><summary>Ver detalle</summary><dl><div><dt>Contacto</dt><dd>{sale.guestContact || 'Sin indicar'}</dd></div><div><dt>Recogida / entrega</dt><dd>{sale.pickupLocation || 'A coordinar'}</dd></div>
      {sale.endDate && <div><dt>Devolución</dt><dd>{formatServiceDate(sale.endDate)} · {sale.endTime?.slice(0, 5)}</dd></div>}
      <div><dt>Vencimiento del cupón</dt><dd>{formatDateTime(sale.expiresAt, timeZone)}</dd></div></dl>
      {['requested', 'ready', 'expired'].includes(state) && <button className="reception-cancel" type="button" onClick={onCancel}><Icon name="x" /> Cancelar reserva</button>}
    </details></div>
    <div className="reception-row-action"><strong>{formatMoney(sale.amount)}</strong>
      {state === 'requested' && <button className="reception-button reception-soft" type="button" onClick={onConfirm}><Icon name="check" /> Confirmar disponibilidad</button>}
      {state === 'ready' && <button className="reception-button reception-primary" type="button" onClick={onCollect}><Icon name="coins" /> Cobrar</button>}
    </div></article>;
}

function Confirmation({ dialog: { sale, action }, error, busy, onCancel, onConfirm }) {
  const panel = useRef(null); const cancel = useRef(null); const busyRef = useRef(busy); const closeRef = useRef(onCancel);
  useEffect(() => { busyRef.current = busy; closeRef.current = onCancel; }, [busy, onCancel]);
  useEffect(() => {
    const previous = document.activeElement; const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; cancel.current?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape' && !busyRef.current) closeRef.current();
      if (event.key !== 'Tab') return;
      const buttons = panel.current.querySelectorAll('button:not(:disabled)');
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (!buttons.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus(); };
  }, []);
  const collect = action === 'collect'; const cancelAction = action === 'cancel';
  return <div className="reception-backdrop"><section className="reception-dialog" ref={panel} role="alertdialog" aria-modal="true" aria-busy={busy} aria-labelledby="confirm-title" aria-describedby="confirm-description">
    <h2 id="confirm-title">{collect ? 'Confirmar cobro en efectivo' : cancelAction ? 'Cancelar esta reserva' : 'Confirmar disponibilidad'}</h2>
    <p id="confirm-description">{collect ? '¿Recibiste este importe del huésped?' : cancelAction ? 'La reserva quedará cancelada y no se podrá cobrar.' : '¿La empresa confirmó la fecha y el horario solicitados?'}</p>
    {collect && <p className="reception-confirm-amount">{formatMoney(sale.amount)}</p>}
    <dl className="reception-confirm-details"><div><dt>Huésped</dt><dd>{sale.guestName}</dd></div><div><dt>Habitación</dt><dd>{sale.guestRoom || 'Sin indicar'}</dd></div><div><dt>Servicio</dt><dd>{sale.recommendationTitle}</dd></div><div><dt>Fecha solicitada</dt><dd>{formatServiceDate(sale.serviceDate)} · {sale.serviceTime?.slice(0, 5)}</dd></div>{sale.endDate && <div><dt>Devolución</dt><dd>{formatServiceDate(sale.endDate)} · {sale.endTime?.slice(0, 5)}</dd></div>}<div><dt>Cupón</dt><dd>{sale.bookingCode}</dd></div></dl>
    {error && <p className="reception-alert" role="alert">{error}</p>}
    <div className="reception-dialog-actions"><button ref={cancel} className="reception-button reception-soft" type="button" disabled={busy} onClick={onCancel}>{collect ? 'Todavía no' : 'Volver'}</button><button className="reception-button reception-primary" type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Registrando...' : collect ? 'Sí, recibí el efectivo' : cancelAction ? 'Sí, cancelar reserva' : 'Sí, la empresa confirmó'}</button></div>
  </section></div>;
}
