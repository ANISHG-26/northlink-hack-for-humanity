import type { MouseEvent, ReactNode } from 'react'
import { Brand } from '../components/Brand'
import { LanguageToggle } from '../components/LanguageToggle'
import { useT } from '../i18n'
import { useAppStore, type View } from '../store/useAppStore'

const S = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 1.8, 'aria-hidden': true } as const

// Tile icons, underline colours and destinations from the approved reference.
const TILES: { key: 'ensure' | 'track' | 'data' | 'parts' | 'partners' | 'jobs'; color: string; to: View; anchor?: string; icon: ReactNode }[] = [
  { key: 'ensure', color: '#7FD3E0', to: 'resident', icon: <svg {...S}><path d="M12 2.7s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" /></svg> },
  {
    key: 'track',
    color: '#9BC7F0',
    to: 'driver',
    icon: (
      <svg {...S}>
        <rect x="1" y="6" width="14" height="10" rx="1" />
        <path d="M15 9h4l3 3v4h-7" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    ),
  },
  { key: 'data', color: '#8FE0C4', to: 'dispatcher', icon: <svg {...S}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg> },
  {
    key: 'parts',
    color: '#F3D2BC',
    to: 'parts',
    icon: (
      <svg {...S}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 1.2 14H1a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 5 2.3l.1.1A1.7 1.7 0 0 0 7 2.7 1.7 1.7 0 0 0 8 1.2V1a2 2 0 0 1 4 0" />
      </svg>
    ),
  },
  { key: 'partners', color: '#F0B97A', to: 'parts', anchor: 'partners-heading', icon: <svg {...S}><path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-7 10 7z" /></svg> },
  {
    key: 'jobs',
    color: '#C9B6F0',
    to: 'jobs',
    icon: (
      <svg {...S}>
        <circle cx="9" cy="7" r="4" />
        <path d="M1 21v-1a6 6 0 0 1 12 0v1M16 11l2 2 4-4" />
      </svg>
    ),
  },
]

export function HomeView() {
  const t = useT()
  const r = t.ref
  const navigate = useAppStore((s) => s.navigate)

  function go(e: MouseEvent, v: View, anchor?: string) {
    e.preventDefault()
    navigate(v, anchor)
  }

  return (
    <>
      <header className="hero">
        {/* Real photo when public/hero.jpg exists; otherwise the gradient sky shows through. */}
        <div className="hero-photo" role="img" aria-label={r.heroPhoto} style={{ backgroundImage: "url('/hero.jpg')" }} />
        <svg className="hero-waves" viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 220 C 240 180 480 260 720 220 S 1200 180 1440 220" fill="none" stroke="#fff" strokeWidth="1.5" />
          <path d="M0 270 C 260 230 500 310 760 270 S 1220 230 1440 270" fill="none" stroke="#fff" strokeWidth="1" />
          <path d="M0 320 C 280 290 520 350 780 320 S 1240 290 1440 320" fill="none" stroke="#fff" strokeWidth=".8" />
        </svg>
        <div className="wrap nav">
          <Brand />
          <LanguageToggle />
        </div>

        <div className="wrap hero-body">
          <h1>{r.heroTitle}</h1>
          <p className="lede">{r.lede}</p>
          <div className="hero-actions">
            <a className="btn btn-light" href="/resident" onClick={(e) => go(e, 'resident')}>
              {r.checkWater}
            </a>
            <a className="btn btn-ghost" href="/dispatcher#map-heading" onClick={(e) => go(e, 'dispatcher', 'map-heading')}>
              {r.openMap}
            </a>
          </div>
        </div>

        <nav className="wrap" aria-label={r.sections}>
          <ul className="tiles">
            {TILES.map(({ key, color, to, anchor, icon }) => (
              <li key={key}>
                <a className="tile" href={`/${to}${anchor ? `#${anchor}` : ''}`} onClick={(e) => go(e, to, anchor)}>
                  {icon}
                  <span>{r.tiles[key]}</span>
                  <i style={{ background: color }} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        <section className="wrap why" aria-labelledby="why-title">
          <h2 id="why-title">{t.home.whyTitle}</h2>
          <ul>
            {t.home.why.map((item) => (
              <li key={item} className="card">
                {item}
              </li>
            ))}
          </ul>
          <p className="bridge">{t.home.bridge}</p>
        </section>
      </main>
    </>
  )
}
