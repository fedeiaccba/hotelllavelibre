import Icon from './Icon';

export default function Hero({ hotel }) {
  const location = hotel?.location || 'Albufeira, Algarve, Portugal';

  return (
    <section className="catalog-hero">
      <div className="relative overflow-hidden bg-[#24726b]">
        <img
          alt="Costa turistica del Algarve cerca del hotel"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=88"
        />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(40,25,20,0.78)_0%,rgba(70,45,35,0.46)_48%,rgba(255,255,255,0.10)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#241915]/60 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[230px] max-w-7xl flex-col justify-between gap-5 p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/18 px-3.5 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
              <Icon name="mapPin" size={14} />
              {location}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/14 px-3.5 py-2 text-xs font-semibold text-white/90 backdrop-blur-md">
              <Icon name="concierge" size={14} />
              Seleccionado por el hotel
            </span>
          </div>

          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#ecca80]">
              {hotel?.name || 'LlaveLibre'}
            </p>
            <h1 className="font-display text-[2.3rem] font-semibold leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Excursiones y alquileres
            </h1>
            <span className="mt-5 block h-px w-24 bg-gradient-to-r from-[#e8c879] to-transparent" />
            <p className="mt-4 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
              Elegí tu próxima experiencia en {location}. Solicitá tu reserva y pagá en recepción.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
