/** Household water tank with animated fill level. Decorative shape, labelled for screen readers. */
export function TankIllustration({ percent, label }: { percent: number; label: string }) {
  const pct = Math.max(0, Math.min(100, percent))
  // Inner water area: x 14..106, y 22..150 (height 128)
  const top = 22
  const height = 128
  const waterY = top + height * (1 - pct / 100)

  return (
    <svg viewBox="0 0 120 170" role="img" aria-label={label} className="w-full h-auto max-w-[9.5rem]">
      <defs>
        <clipPath id="tank-inner">
          <rect x="14" y={top} width="92" height={height} rx="10" />
        </clipPath>
        <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E9AA7" />
          <stop offset="1" stopColor="#2B6CB0" />
        </linearGradient>
      </defs>

      {/* Lid and inlet */}
      <rect x="46" y="4" width="28" height="10" rx="3" fill="#0F2A44" />
      {/* Tank body */}
      <rect x="8" y="14" width="104" height="144" rx="16" fill="#FFFFFF" stroke="#0F2A44" strokeWidth="4" />
      <rect x="14" y={top} width="92" height={height} rx="10" fill="#EAF4F8" />

      {/* Water */}
      <g clipPath="url(#tank-inner)">
        <g style={{ transform: `translateY(${waterY - top}px)`, transition: 'transform 900ms cubic-bezier(.2,.8,.2,1)' }}>
          <rect x="0" y={top + 4} width="120" height={height + 10} fill="url(#water-grad)" />
          <path
            className="tank-wave"
            d={`M -40 ${top + 6} q 15 -6 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 V ${top + 12} H -40 Z`}
            fill="#0E9AA7"
          />
        </g>
      </g>

      {/* Level marks: 3/4, 1/2, 1/4 */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1="96"
          x2="106"
          y1={top + height * f}
          y2={top + height * f}
          stroke="#0F2A44"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}

      {/* Feet */}
      <rect x="20" y="158" width="14" height="8" rx="2" fill="#0F2A44" />
      <rect x="86" y="158" width="14" height="8" rx="2" fill="#0F2A44" />
    </svg>
  )
}
