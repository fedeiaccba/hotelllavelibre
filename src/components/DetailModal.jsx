import { useEffect } from 'react';
import { CATEGORIES, CATEGORY_STYLES, DIFFICULTY_STYLES } from '../data/recommendations';
import Icon from './Icon';

export default function DetailModal({ rec, onClose, onCheckout }) {
  const category = CATEGORIES.find((item) => item.id === rec.category);
  const categoryStyle = CATEGORY_STYLES[rec.category] || { bg: '#f1e6d2', color: '#6e1f2c' };

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

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[#1a1210]/60 p-0 backdrop-blur-md md:items-center md:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-content flex max-h-[93dvh] w-full flex-col overflow-hidden rounded-t-[32px] border border-white/70 bg-white shadow-[0_-18px_70px_rgba(26,18,16,0.20)] md:max-w-2xl md:rounded-[32px]">
        <div className="relative h-60 shrink-0 overflow-hidden bg-[#ede1cd]">
          <img alt={rec.title} className="h-full w-full object-cover" decoding="async" src={rec.image} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#241915]/45 to-transparent" />

          <button
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#4a342a] shadow-sm transition hover:bg-white"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" size={16} strokeWidth={2.2} />
          </button>

          <span
            className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md"
            style={{ backgroundColor: categoryStyle.bg, color: categoryStyle.color }}
          >
            <Icon name={category?.icon} size={14} />
            {category?.label}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-7">
          <p className="text-xs font-semibold text-[#a8978b]">{rec.subtitle}</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-normal text-[#2a1d18] sm:text-3xl">
            {rec.title}
          </h2>

          <div className="mt-5 flex flex-wrap gap-2">
            {rec.duration && <MetaBlock icon="clock" title="Duración" value={rec.duration} />}
            {rec.provider && <MetaBlock icon="shield" title="Proveedor" value={rec.provider} />}
            {rec.difficulty && (
              <MetaBlock
                icon="mountain"
                title="Dificultad"
                value={rec.difficulty}
                style={DIFFICULTY_STYLES[rec.difficulty]}
              />
            )}
          </div>

          <section className="mt-7">
            <SectionLabel>Descripción</SectionLabel>
            <p className="text-sm leading-7 text-[#7c6a5e]">{rec.fullDescription}</p>
          </section>

          {rec.bookable && (
            <section className="mt-7 overflow-hidden rounded-[24px] border border-[#c49a3f]/35 bg-[linear-gradient(135deg,#fbf5ea_0%,#f4e9d4_100%)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6e1f2c]">
                    <Icon name="key" size={15} />
                    Reservá y pagá online
                  </p>
                  {rec.provider && (
                    <p className="mt-2 truncate text-sm font-medium text-[#7c6a5e]">{rec.provider}</p>
                  )}
                </div>
                {rec.price > 0 && (
                  <div className="shrink-0 text-right">
                    <p className="font-display text-2xl font-bold text-[#2a1d18]">€{rec.price}</p>
                  </div>
                )}
              </div>
              <button
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#7d2230_0%,#6e1f2c_50%,#581522_100%)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(94,26,42,0.28)] transition hover:brightness-110 active:scale-[0.98]"
                onClick={() => onCheckout(rec)}
                type="button"
              >
                Reservar y pagar €{rec.price}
                <Icon name="arrowRight" size={16} />
              </button>
              <p className="mt-3 text-xs leading-5 text-[#7c6a5e]">
                Reservá desde tu teléfono. La recepción del hotel coordina y confirma tu reserva.
              </p>
            </section>
          )}

          <section className="mt-7 grid gap-3 sm:grid-cols-2">
            <InfoRow icon="mapPin" label="Ubicación" value={rec.location} />
            {rec.hours && <InfoRow icon="clock" label="Horarios" value={rec.hours} />}
          </section>

          {rec.tips?.length > 0 && (
            <section className="mt-7">
              <SectionLabel>Consejos útiles</SectionLabel>
              <ul className="space-y-2.5">
                {rec.tips.map((tip) => (
                  <li className="flex gap-3 text-sm leading-6 text-[#7c6a5e]" key={tip}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c49a3f]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <a
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#e6d7bf] px-5 py-3.5 text-sm font-semibold text-[#6e1f2c] no-underline transition hover:border-[#cbb389]"
            href={rec.mapUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon name="mapPin" size={16} />
            Cómo llegar
          </a>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e1f2c]">
      {children}
    </h3>
  );
}

function MetaBlock({ icon, title, value, style }) {
  return (
    <div
      className="min-w-0 rounded-[20px] border border-[#ece0cc] bg-[#fbf5ea] px-4 py-3"
      style={style ? { backgroundColor: style.bg, color: style.color } : undefined}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a8978b]">
        <Icon name={icon} size={14} />
        {title}
      </div>
      <p className="mt-1 max-w-[12rem] truncate text-sm font-semibold text-[#2a1d18]">{value}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="min-w-0 rounded-[22px] border border-[#ece0cc] bg-[#fbf5ea] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a8978b]">
        <Icon name={icon} size={14} />
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-medium leading-6 text-[#2a1d18]">{value}</p>
    </div>
  );
}
