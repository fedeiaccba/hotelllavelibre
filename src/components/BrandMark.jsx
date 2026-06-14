const sizes = {
  sm: {
    box: 'h-10 w-10 rounded-2xl',
    letters: 'text-[15px]',
    key: 'h-4 w-4',
  },
  md: {
    box: 'h-14 w-14 rounded-[22px]',
    letters: 'text-xl',
    key: 'h-5 w-5',
  },
  lg: {
    box: 'h-16 w-16 rounded-[24px]',
    letters: 'text-2xl',
    key: 'h-6 w-6',
  },
};

export default function BrandMark({ className = '', size = 'sm' }) {
  const selected = sizes[size] || sizes.sm;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-[#c49a3f]/55 bg-[linear-gradient(150deg,#6e1f2c_0%,#4a111b_55%,#1a1210_100%)] font-display font-bold text-[#ecca80] shadow-[0_14px_32px_rgba(26,18,16,0.28)] ${selected.box} ${className}`}
      aria-label="LlaveLibre"
    >
      {/* Hairline dorada superior, como el ribete del uniforme */}
      <span className="absolute inset-x-2 top-2 h-px bg-gradient-to-r from-transparent via-[#e8c879]/75 to-transparent" />
      <span className="relative z-10 flex items-center gap-0.5">
        <span className={`tracking-[-0.08em] ${selected.letters}`}>LL</span>
      </span>
      {/* Llave dorada del conserje */}
      <svg
        aria-hidden="true"
        className={`absolute bottom-1.5 right-1.5 text-[#e8c879]/85 ${selected.key}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="8.5" cy="8.5" r="4.5" />
        <path d="m11.8 11.8 8 8" />
        <path d="m18.4 15.2 1.8-1.8" />
        <path d="m15.4 18.2 1.8-1.8" />
      </svg>
    </div>
  );
}
