import Icon from './Icon';

export default function Hero({ hotel }) {
  const location = hotel?.location || 'Albufeira, Algarve, Portugal';

  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-6 sm:pb-8 lg:px-8">
      <div className="relative overflow-hidden rounded-[32px] bg-[#e4d5bd] shadow-[0_24px_70px_rgba(94,26,42,0.18)] sm:rounded-[36px]">
        <img
          alt="Costa turistica del Algarve cerca del hotel"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=88"
        />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(40,25,20,0.78)_0%,rgba(70,45,35,0.46)_48%,rgba(255,255,255,0.10)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#241915]/60 to-transparent" />

        <div className="relative z-10 flex min-h-[360px] flex-col justify-between p-5 sm:min-h-[430px] sm:p-8 lg:p-10">
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
              Conserjería · Guía local para tu estadía
            </p>
            <h1 className="font-display text-[2.3rem] font-semibold leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Descubrí qué hacer cerca de tu hotel
            </h1>
            <span className="mt-5 block h-px w-24 bg-gradient-to-r from-[#e8c879] to-transparent" />
            <p className="mt-4 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
              Una selección de experiencias del conserje, pensada para que disfrutes mejor tu estadía.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
