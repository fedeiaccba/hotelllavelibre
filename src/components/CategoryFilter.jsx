import { CATEGORIES } from '../data/recommendations';
import Icon from './Icon';

export default function CategoryFilter({ active, onChange }) {
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto whitespace-nowrap pb-1 hide-scrollbar">
      {CATEGORIES.map((category) => {
        const isActive = active === category.id;

        return (
          <button
            className={[
              'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98]',
              isActive
                ? 'border-[#6e1f2c] bg-[#6e1f2c] text-white shadow-[0_12px_26px_rgba(94,26,42,0.22)]'
                : 'border-[#e6d7bf] bg-white/80 text-[#7c6a5e] shadow-sm hover:border-[#cbb389] hover:text-[#4a342a]',
            ].join(' ')}
            key={category.id}
            onClick={() => onChange(category.id)}
            type="button"
          >
            <Icon name={category.icon} size={16} />
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
