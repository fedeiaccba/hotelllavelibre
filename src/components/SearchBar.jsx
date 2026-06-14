import Icon from './Icon';

export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a8978b]"
        name="search"
        size={19}
      />
      <input
        aria-label="Buscar servicios"
        className="h-14 w-full rounded-full border border-[#e6d7bf] bg-white px-12 text-[15px] font-medium text-[#2a1d18] shadow-[0_10px_28px_rgba(94,26,42,0.07)] outline-none transition placeholder:text-[#b6a594] focus:border-[#c49a3f] focus:ring-4 focus:ring-[#e7cf9b]/70"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar servicio, lugar o tipo..."
        type="text"
        value={value}
      />
      {value && (
        <button
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f3e8d6] text-[#8a786b] transition hover:bg-[#e6d7bf]"
          onClick={() => onChange('')}
          type="button"
        >
          <Icon name="x" size={15} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
