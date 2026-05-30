import Icon from './Icon';

export default function Hero({ hotel }) {
  const location = hotel?.location || 'Albufeira, Algarve, Portugal';

  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-6 sm:pb-8 lg:px-8">
      <div className="relative overflow-hidden rounded-[32px] bg-[#d9cee9] shadow-[0_24px_70px_rgba(96,75,132,0.18)] sm:rounded-[36px]">
        <img
          alt="Costa turistica del Algarve cerca del hotel"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=88"
        />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(36,30,53,0.78)_0%,rgba(58,46,78,0.46)_48%,rgba(255,255,255,0.10)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#241e35]/60 to-transparent" />

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
            <p className="mb-3 text-sm font-medium text-white/78">Guia local para tu estadia</p>
            <h1 className="text-[2.15rem] font-semibold leading-[1.05] tracking-normal text-white sm:text-5xl lg:text-6xl">
              Descubri que hacer cerca de tu hotel
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/82 sm:text-lg">
              Recomendaciones seleccionadas para disfrutar mejor tu estadia.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
