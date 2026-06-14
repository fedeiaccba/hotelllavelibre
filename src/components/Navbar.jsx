import BrandMark from './BrandMark';
import Icon from './Icon';

export default function Navbar({ hotel }) {
  const location = hotel?.location?.split(',')[0] || 'Albufeira';

  return (
    <nav className="sticky top-0 z-40 border-b border-[#ece0cc] bg-[#fbf5ea]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark />
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold text-[#2a1d18] sm:text-base">
              {hotel?.name || 'Hotel Atlantico Albufeira'}
            </p>
            <p className="hidden text-xs font-medium tracking-wide text-[#9a877a] sm:block">
              Conserjería digital
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[#ece0cc] bg-white/75 px-3 py-2 text-xs font-semibold text-[#6e1f2c] shadow-sm">
            <Icon name="mapPin" size={14} />
            <span className="hidden sm:inline">{location}</span>
            <span className="sm:hidden">{location.slice(0, 3).toUpperCase()}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
