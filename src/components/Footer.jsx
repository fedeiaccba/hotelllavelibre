import BrandMark from './BrandMark';
import Icon from './Icon';

export default function Footer({ hotel }) {
  function joinPlatform() {
    window.location.href = '/admin/login';
  }

  const location = hotel?.location || 'Albufeira, Algarve, Portugal';

  return (
    <footer className="border-t border-white/80 bg-white/72">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 text-center sm:grid-cols-[1fr_auto] sm:items-center sm:px-6 sm:text-left lg:grid-cols-[1fr_auto_auto] lg:px-8">
        <div className="flex items-center justify-center gap-3 sm:justify-start">
          <BrandMark />
          <div>
            <p className="font-display text-[15px] font-semibold text-[#2a1d18]">
              {hotel?.name || 'Hotel Atlantico Albufeira'}
            </p>
            <p className="text-xs text-[#9a877a]">Tu conserje local durante la estadía</p>
          </div>
        </div>

        <p className="text-xs leading-5 text-[#9a877a] sm:text-right lg:text-center">
          {location} · {new Date().getFullYear()}
        </p>

        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1a1210] px-5 text-sm font-semibold text-[#ecca80] shadow-[0_14px_30px_rgba(26,18,16,0.18)] transition hover:bg-[#241915] active:scale-[0.98]"
          onClick={joinPlatform}
          type="button"
        >
          Unite a LlaveLibre
          <Icon name="arrowRight" size={16} />
        </button>
      </div>
    </footer>
  );
}
