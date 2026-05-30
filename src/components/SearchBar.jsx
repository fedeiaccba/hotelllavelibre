import Icon from './Icon';

export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9b93ad]"
        name="search"
        size={19}
      />
      <input
        aria-label="Buscar recomendaciones"
        className="h-14 w-full rounded-full border border-[#e8def3] bg-white px-12 text-[15px] font-medium text-[#242130] shadow-[0_10px_28px_rgba(96,75,132,0.07)] outline-none transition placeholder:text-[#a8a1b7] focus:border-[#b9a8d3] focus:ring-4 focus:ring-[#ded2ef]/70"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar actividad, lugar o categoría..."
        type="text"
        value={value}
      />
      {value && (
        <button
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f0eaf7] text-[#766c8a] transition hover:bg-[#e6dcef]"
          onClick={() => onChange('')}
          type="button"
        >
          <Icon name="x" size={15} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
