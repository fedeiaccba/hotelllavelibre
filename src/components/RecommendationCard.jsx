import { CATEGORIES, CATEGORY_STYLES, DIFFICULTY_STYLES } from '../data/recommendations';
import Icon from './Icon';

const FALLBACKS = {
  restaurante: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&q=80',
  bar: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1000&q=80',
  excursion: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1000&q=80',
  taxi: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1000&q=80',
  'alquiler-auto': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&q=80',
  default: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&q=80',
};

const FALLBACK_STYLE = { bg: '#f1e6d2', color: '#6e1f2c', soft: '#fbf5ea' };

export default function RecommendationCard({ rec, index, onCheckout, onSelect }) {
  const category = CATEGORIES.find((item) => item.id === rec.category);
  const categoryStyle = CATEGORY_STYLES[rec.category] || FALLBACK_STYLE;
  const difficultyStyle = rec.difficulty ? DIFFICULTY_STYLES[rec.difficulty] : null;

  return (
    <article
      className={`rec-card card-animate stagger-${Math.min(index + 1, 9)} flex min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#ece0cc] bg-white shadow-[0_18px_55px_rgba(94,26,42,0.10)]`}
    >
      <div className="relative h-56 overflow-hidden bg-[#ede1cd]">
        <img
          alt={rec.title}
          className="h-full w-full object-cover transition duration-500"
          decoding="async"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = FALLBACKS[rec.category] || FALLBACKS.default;
            event.currentTarget.onerror = null;
          }}
          src={rec.image}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#241915]/30 via-transparent to-transparent" />
        <span
          className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm"
          style={{ backgroundColor: categoryStyle.bg, color: categoryStyle.color }}
        >
          <Icon name={category?.icon} size={14} />
          {category?.label}
        </span>
        {rec.bookable && rec.price > 0 && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-[#c49a3f]/40 bg-[#1a1210] px-3 py-1.5 text-xs font-bold text-[#ecca80] shadow-sm">
            <Icon name="tag" size={13} />
            €{rec.price}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-1 flex-col">
          <p className="text-xs font-semibold text-[#a8978b]">{rec.subtitle}</p>
          <h3 className="mt-2 text-xl font-semibold leading-snug tracking-normal text-[#2a1d18]">
            {rec.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#7c6a5e]">
            {rec.shortDescription}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#ece0cc] pt-4 text-xs font-semibold text-[#8a786b]">
          {rec.location && <MetaChip icon="mapPin" label={rec.location} />}
          {rec.duration && <MetaChip icon="clock" label={rec.duration} />}
          {rec.difficulty && (
            <span
              className="inline-flex min-w-0 items-center gap-1.5 rounded-full px-3 py-2"
              style={{ backgroundColor: difficultyStyle.bg, color: difficultyStyle.color }}
            >
              {rec.difficulty}
            </span>
          )}
        </div>

        {rec.bookable ? (
          <div className="mt-5 flex items-center gap-2">
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#6e1f2c] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(94,26,42,0.22)] transition hover:bg-[#561420] active:scale-[0.98]"
              onClick={() => onCheckout(rec)}
              type="button"
            >
              Reservar y pagar €{rec.price}
            </button>
            <button
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#e6d7bf] px-4 py-3 text-sm font-semibold text-[#6e1f2c] transition hover:border-[#cbb389]"
              onClick={() => onSelect(rec)}
              type="button"
            >
              Ver más
            </button>
          </div>
        ) : (
          <button
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6e1f2c] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(94,26,42,0.22)] transition hover:bg-[#561420] active:scale-[0.98]"
            onClick={() => onSelect(rec)}
            type="button"
          >
            Ver más
            <Icon name="arrowRight" size={16} />
          </button>
        )}
      </div>
    </article>
  );
}

function MetaChip({ icon, label }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#f6edde] px-3 py-2 text-[#8a786b]">
      <Icon className="shrink-0 text-[#b08d57]" name={icon} size={14} />
      <span className="truncate">{label}</span>
    </span>
  );
}
