import Icon from './Icon';

const HIGHLIGHTS = [
  {
    icon: 'mountain',
    title: 'Costa cerca',
    desc: 'Playas, grutas y acantilados dorados a poca distancia del hotel.',
  },
  {
    icon: 'utensils',
    title: 'Sabores del mar',
    desc: 'Cataplana, pescado fresco, dulces de almendra y vinos portugueses.',
  },
  {
    icon: 'compass',
    title: 'Plan simple',
    desc: 'Ideas pensadas para decidir rápido desde el hotel y salir sin fricción.',
  },
];

export default function AboutZone() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
      <div className="rounded-[32px] border border-white/85 bg-white/72 p-6 shadow-[0_18px_55px_rgba(94,26,42,0.08)] sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a877a]">
              Información del lugar
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#2a1d18] sm:text-3xl">
              Albufeira, entre playas, grutas y cultura algarvia
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#7c6a5e] sm:text-[15px]">
              Una ciudad ideal para alternar descanso, mar, paseos y buena mesa. Esta guía reúne
              recomendaciones cercanas para que cada huésped pueda armar su día con calma.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <div
                className="rounded-[26px] border border-[#ece0cc] bg-[#fbf5ea] p-5"
                key={item.title}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1e6d2] text-[#6e1f2c]">
                  <Icon name={item.icon} size={20} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-[#2a1d18]">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#9a877a]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
