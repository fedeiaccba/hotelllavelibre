import { CATEGORIES, CATEGORY_STYLES, DIFFICULTY_STYLES } from '../data/recommendations';
import Icon from './Icon';

const FALLBACKS = {
  trekking: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1000&q=85',
  aventuras: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1000&q=85',
  gastronomia: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1000&q=85',
  informacion: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1000&q=85',
  eventos: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1000&q=85',
  imperdibles: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1000&q=85',
};

export default function RecommendationCard({ rec, index, onSelect }) {
  const category = CATEGORIES.find((item) => item.id === rec.category);
  const categoryStyle = CATEGORY_STYLES[rec.category] || CATEGORY_STYLES.informacion;
  const difficultyStyle = rec.difficulty ? DIFFICULTY_STYLES[rec.difficulty] : null;

  return (
    <article
      className={`rec-card card-animate stagger-${Math.min(index + 1, 9)} flex min-w-0 flex-col overflow-hidden rounded-[30px] border border-white/85 bg-white/82 shadow-[0_18px_55px_rgba(96,75,132,0.10)] backdrop-blur`}
    >
      <div className="relative h-56 overflow-hidden bg-[#ece5f4]">
        <img
          alt={rec.title}
          className="h-full w-full object-cover transition duration-500"
          onError={(event) => {
            event.currentTarget.src = FALLBACKS[rec.category] || FALLBACKS.imperdibles;
            event.currentTarget.onerror = null;
          }}
          src={rec.image}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#221c30]/30 via-transparent to-transparent" />
        <span
          className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md"
          style={{ backgroundColor: categoryStyle.bg, color: categoryStyle.color }}
        >
          <Icon name={category?.icon} size={14} />
          {category?.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-1 flex-col">
          <p className="text-xs font-semibold text-[#9a91aa]">{rec.subtitle}</p>
          <h3 className="mt-2 text-xl font-semibold leading-snug tracking-normal text-[#242130]">
            {rec.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#6f6a7f]">
            {rec.shortDescription}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#efe8f5] pt-4 text-xs font-semibold text-[#716b82]">
          <MetaChip icon="mapPin" label={rec.distance} />
          <MetaChip icon="clock" label={rec.duration} />
          {rec.difficulty && (
            <span
              className="inline-flex min-w-0 items-center gap-1.5 rounded-full px-3 py-2"
              style={{ backgroundColor: difficultyStyle.bg, color: difficultyStyle.color }}
            >
              {rec.difficulty}
            </span>
          )}
        </div>

        <button
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6f5c92] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(111,92,146,0.22)] transition hover:bg-[#5d4d7c] active:scale-[0.98]"
          onClick={() => onSelect(rec)}
          type="button"
        >
          Ver más
          <Icon name="arrowRight" size={16} />
        </button>
      </div>
    </article>
  );
}

function MetaChip({ icon, label }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#f6f1fb] px-3 py-2 text-[#716b82]">
      <Icon className="shrink-0 text-[#8b76a9]" name={icon} size={14} />
      <span className="truncate">{label}</span>
    </span>
  );
}
