export function BrandMark() {
  return (
    <div className="flex items-center gap-3" aria-label="HUB Innovation Challenge">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-hub-text shadow-sm">
        <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
          <circle cx="24" cy="24" r="15" fill="none" stroke="#ffffff" strokeWidth="3" />
          <path d="M10 23.5c6-7.5 15-11 28-10.5M12 33c7.5-2.5 15-8 24-19M17 10c5 7 8 15 8 27" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="13" cy="24" r="3.4" fill="#ffffff" />
          <circle cx="23" cy="13" r="3.2" fill="#ffffff" />
          <circle cx="25" cy="36" r="3.1" fill="#ffffff" />
          <circle cx="37" cy="22" r="3.4" fill="#FFB000" />
        </svg>
      </div>
      <div className="leading-none">
        <div className="flex items-baseline gap-1">
          <span className="text-[1.72rem] font-semibold tracking-[0] text-hub-text sm:text-[2rem]">HUB</span>
          <span className="text-[1.72rem] font-medium tracking-[0] text-hub-primary sm:text-[2rem]">Challenge</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-px w-7 bg-hub-primary" />
          <span className="text-[0.56rem] font-semibold uppercase tracking-[0.48em] text-hub-muted">Faculdade Hub</span>
          <span className="h-px w-7 bg-hub-primary" />
        </div>
      </div>
    </div>
  );
}
