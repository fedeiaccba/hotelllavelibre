import { useEffect } from 'react';
import { CATEGORIES, CATEGORY_STYLES, DIFFICULTY_STYLES } from '../data/recommendations';
import Icon from './Icon';

export default function DetailModal({ rec, onClose }) {
  const category = CATEGORIES.find((item) => item.id === rec.category);
  const categoryStyle = CATEGORY_STYLES[rec.category] || CATEGORY_STYLES.informacion;

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
      className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[#211b2f]/60 p-0 backdrop-blur-md md:items-center md:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-content flex max-h-[93dvh] w-full flex-col overflow-hidden rounded-t-[32px] border border-white/70 bg-white shadow-[0_-18px_70px_rgba(30,23,45,0.20)] md:max-w-2xl md:rounded-[32px]">
        <div className="relative h-60 shrink-0 overflow-hidden bg-[#ece5f4]">
          <img alt={rec.title} className="h-full w-full object-cover" src={rec.image} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#221c30]/45 to-transparent" />

          <button
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#4f4562] shadow-sm transition hover:bg-white"
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
          <p className="text-xs font-semibold text-[#9a91aa]">{rec.subtitle}</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-normal text-[#242130] sm:text-3xl">
            {rec.title}
          </h2>

          <div className="mt-5 flex flex-wrap gap-2">
            <MetaBlock icon="mapPin" title="Distancia" value={rec.distance} />
            <MetaBlock icon="clock" title="Duración" value={rec.duration} />
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
            <p className="text-sm leading-7 text-[#625d70]">{rec.fullDescription}</p>
          </section>

          <section className="mt-7 grid gap-3 sm:grid-cols-2">
            <InfoRow icon="mapPin" label="Ubicación" value={rec.location} />
            {rec.hours && <InfoRow icon="clock" label="Horarios" value={rec.hours} />}
          </section>

          {rec.tips?.length > 0 && (
            <section className="mt-7">
              <SectionLabel>Consejos útiles</SectionLabel>
              <ul className="space-y-2.5">
                {rec.tips.map((tip) => (
                  <li className="flex gap-3 text-sm leading-6 text-[#625d70]" key={tip}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9b86bd]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <a
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6f5c92] px-5 py-3.5 text-sm font-semibold text-white no-underline shadow-[0_14px_30px_rgba(111,92,146,0.22)] transition hover:bg-[#5d4d7c]"
            href={rec.mapUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Abrir en Google Maps
            <Icon name="arrowRight" size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6f5c92]">
      {children}
    </h3>
  );
}

function MetaBlock({ icon, title, value, style }) {
  return (
    <div
      className="min-w-0 rounded-[20px] border border-[#efe7f6] bg-[#faf7ff] px-4 py-3"
      style={style ? { backgroundColor: style.bg, color: style.color } : undefined}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a91aa]">
        <Icon name={icon} size={14} />
        {title}
      </div>
      <p className="mt-1 max-w-[12rem] truncate text-sm font-semibold text-[#242130]">{value}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="min-w-0 rounded-[22px] border border-[#efe7f6] bg-[#fbf8ff] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a91aa]">
        <Icon name={icon} size={14} />
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-medium leading-6 text-[#242130]">{value}</p>
    </div>
  );
}
