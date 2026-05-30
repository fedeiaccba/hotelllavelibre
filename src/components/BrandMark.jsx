const sizes = {
  sm: {
    box: 'h-10 w-10 rounded-2xl',
    letters: 'text-[15px]',
    key: 'bottom-2 right-2 h-1.5 w-1.5',
  },
  md: {
    box: 'h-14 w-14 rounded-[22px]',
    letters: 'text-xl',
    key: 'bottom-3 right-3 h-2 w-2',
  },
  lg: {
    box: 'h-16 w-16 rounded-[24px]',
    letters: 'text-2xl',
    key: 'bottom-3 right-3 h-2.5 w-2.5',
  },
};

export default function BrandMark({ className = '', size = 'sm' }) {
  const selected = sizes[size] || sizes.sm;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-[#d6a95d]/45 bg-[#071521] font-serif font-semibold text-[#f3d190] shadow-[0_14px_32px_rgba(7,21,33,0.20)] ${selected.box} ${className}`}
      aria-label="LlaveLibre"
    >
      <span className={`relative z-10 tracking-[-0.08em] ${selected.letters}`}>LL</span>
      <span className="absolute inset-x-2 top-2 h-px bg-gradient-to-r from-transparent via-[#d6a95d]/65 to-transparent" />
      <span className={`absolute rounded-full border border-[#d6a95d] ${selected.key}`}>
        <span className="absolute left-full top-1/2 h-px w-2 -translate-y-1/2 bg-[#d6a95d]" />
      </span>
    </div>
  );
}
