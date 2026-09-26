/** Map pin holding a water drop over waves. Decorative unless `title` is given. */
export function LogoMark({ className = 'h-10 w-10', title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 60" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id="nl-pin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0E9AA7" />
        </linearGradient>
        <clipPath id="nl-pin-clip">
          <path d="M24 2C12.4 2 3 11.2 3 22.6 3 37.4 24 58 24 58s21-20.6 21-35.4C45 11.2 35.6 2 24 2z" />
        </clipPath>
      </defs>
      <path d="M24 2C12.4 2 3 11.2 3 22.6 3 37.4 24 58 24 58s21-20.6 21-35.4C45 11.2 35.6 2 24 2z" fill="#0F2A44" />
      <path
        d="M24 6.5C14.9 6.5 7.5 13.7 7.5 22.6c0 11 13.3 25.8 16.5 29.2 3.2-3.4 16.5-18.2 16.5-29.2C40.5 13.7 33.1 6.5 24 6.5z"
        fill="#fff"
      />
      <path d="M24 11c-3.8 5-6.2 8.6-6.2 11.4a6.2 6.2 0 0 0 12.4 0C30.2 19.6 27.8 16 24 11z" fill="url(#nl-pin)" />
      <g clipPath="url(#nl-pin-clip)" fill="none" stroke="#0E9AA7" strokeWidth="2.6" strokeLinecap="round">
        <path d="M9 33c3-2 6-2 9 0s6 2 9 0 6-2 9 0 6 2 9 0" />
        <path d="M11 39c2.6-1.7 5.2-1.7 7.8 0s5.2 1.7 7.8 0 5.2-1.7 7.8 0" stroke="#2B6CB0" />
      </g>
    </svg>
  )
}

/** "NorthLink" wordmark: North in deep navy, Link in teal. Use on light backgrounds. */
export function Wordmark({ className = 'text-2xl' }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight leading-none ${className}`}>
      <span className="text-navy">North</span>
      <span className="text-teal-dark">Link</span>
    </span>
  )
}
