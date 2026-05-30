import BrandMark from './BrandMark';
import Icon from './Icon';

export default function HotelBranding({ hotel }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
      <div className="overflow-hidden rounded-[32px] border border-white/85 bg-[#f7f1ff]/80 p-6 shadow-[0_18px_55px_rgba(96,75,132,0.09)] sm:p-8 lg:p-10">
        <div className="grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
            <BrandMark size="lg" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8e86a5]">
                Recomendado por el hotel
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[#242130] sm:text-3xl">
                Una guía seleccionada por {hotel?.name || 'el hotel'}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6f6a7f] sm:text-[15px]">
                Seleccionamos actividades, lugares y datos útiles para que aproveches tu estadía
                con la tranquilidad de una recomendación local y confiable.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <TrustItem icon="shield" title="Revisado" text="Opciones pensadas para huéspedes." />
            <TrustItem icon="leaf" title="Local" text="Experiencias cercanas y auténticas." />
            <TrustItem icon="calendar" title="Actual" text="Ideal para planificar durante la estadía." />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustItem({ icon, title, text }) {
  return (
    <div className="flex items-start gap-3 rounded-[24px] border border-white/85 bg-white/68 p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0e8f8] text-[#6f5c92]">
        <Icon name={icon} size={19} />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-[#242130]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#7d758d]">{text}</p>
      </div>
    </div>
  );
}
