import type { MouseEvent } from 'react'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CircleHelp,
  Droplet,
  Handshake,
  HardHat,
  Map as MapIcon,
  Package,
  Truck,
  UsersRound,
  Waves,
} from 'lucide-react'
import { LogoMark, Wordmark } from '../components/Logo'
import { useT } from '../i18n'
import { useAppStore, type View } from '../store/useAppStore'

type CardKey = 'ensure' | 'track' | 'data' | 'inventory' | 'partners' | 'jobs'

// Each card: icon, coloured underline, destination.
const CARDS: { key: CardKey; Icon: typeof Droplet; line: string; to: View; anchor?: string }[] = [
  { key: 'ensure', Icon: Droplet, line: 'from-sky-300 to-sky-accent', to: 'resident' },
  { key: 'track', Icon: Truck, line: 'from-teal to-sky-accent', to: 'driver' },
  { key: 'data', Icon: BarChart3, line: 'from-emerald-300 to-teal', to: 'dispatcher' },
  { key: 'inventory', Icon: Package, line: 'from-indigo-300 to-sky-300', to: 'parts' },
  { key: 'partners', Icon: Handshake, line: 'from-amber-300 to-orange-300', to: 'parts', anchor: 'partners-heading' },
  { key: 'jobs', Icon: Briefcase, line: 'from-rose-300 to-amber-300', to: 'jobs' },
]

const WHY_ICONS = [CircleHelp, HardHat, Waves, MapIcon]

export function HomeView() {
  const t = useT()
  const h = t.home
  const navigate = useAppStore((s) => s.navigate)

  function go(e: MouseEvent, v: View, anchor?: string) {
    e.preventDefault()
    navigate(v, anchor)
  }

  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      {/* ---------- Hero ---------- */}
      <section aria-labelledby="hero-title" className="hero relative isolate flex min-h-[100svh] flex-col overflow-hidden text-white">
        {/* Arctic sky over flat tundra and Hudson Bay (or a real photo at /hero.jpg when provided) */}
        <div aria-hidden="true" className="hero-sky absolute inset-0 -z-20" />
        <svg aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[46%] w-full" viewBox="0 0 1440 400" preserveAspectRatio="none">
          <g fill="none" stroke="#ffffff" strokeLinecap="round">
            <path className="hero-wave" d="M0 120 C 240 90, 480 150, 720 120 S 1200 90, 1440 120" strokeOpacity="0.35" strokeWidth="1.5" />
            <path className="hero-wave hero-wave--slow" d="M0 170 C 240 140, 480 200, 720 170 S 1200 140, 1440 170" strokeOpacity="0.25" strokeWidth="1.5" />
            <path className="hero-wave" d="M0 230 C 260 200, 500 260, 760 230 S 1220 200, 1440 230" strokeOpacity="0.2" strokeWidth="1.5" />
            <path className="hero-wave hero-wave--slow" d="M0 300 C 240 275, 520 325, 760 300 S 1200 275, 1440 300" strokeOpacity="0.15" strokeWidth="1.5" />
          </g>
        </svg>
        {/* Dark overlay keeps text above WCAG AA over any part of the sky/photo */}
        <div aria-hidden="true" className="hero-overlay absolute inset-0 -z-10" />

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-8 pt-24 sm:pt-28">
          {/* Brand block on a light frosted plate so the navy/teal wordmark stays legible */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-4 rounded-3xl bg-white/85 px-5 py-4 shadow-lg backdrop-blur-md">
              <LogoMark className="h-16 w-14 sm:h-20 sm:w-16" />
              <div>
                <h1 id="hero-title">
                  <Wordmark className="text-4xl sm:text-5xl" />
                </h1>
                <p className="mt-2 text-sm font-bold tracking-[0.25em] text-navy">{h.tagline}</p>
              </div>
            </div>
            <p className="mt-6 text-2xl font-semibold leading-snug text-white drop-shadow sm:text-3xl">{h.subtitle}</p>
          </div>

          <div className="mt-auto pt-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <ul aria-label={h.cardsLabel} className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {CARDS.map(({ key, Icon, line, to, anchor }) => (
                  <li key={key}>
                    <a
                      href={`/${to}${anchor ? `#${anchor}` : ''}`}
                      onClick={(e) => go(e, to, anchor)}
                      className="glass-card group flex h-full min-h-[8.5rem] flex-col justify-between rounded-2xl p-4 text-white transition hover:bg-white/25 focus-visible:outline-white"
                    >
                      <Icon aria-hidden="true" className="h-8 w-8" strokeWidth={1.75} />
                      <span>
                        <span className="block text-lg font-semibold leading-tight">{h.cards[key]}</span>
                        <span aria-hidden="true" className={`mt-3 block h-1 w-10 rounded-full bg-gradient-to-r ${line} transition-all group-hover:w-16`} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <a
                href="/dispatcher#map-heading"
                onClick={(e) => go(e, 'dispatcher', 'map-heading')}
                className="tap inline-flex items-center justify-center gap-3 self-start rounded-full bg-white px-7 py-3 text-lg font-bold text-navy shadow-lg transition hover:bg-sky-50 lg:self-end focus-visible:outline-white"
              >
                {h.explore}
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Why now ---------- */}
      <section aria-labelledby="why-title" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 id="why-title" className="text-3xl font-bold text-navy">
            {h.whyTitle}
          </h2>
          <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-accent" />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {h.why.map((item, i) => {
              const Icon = WHY_ICONS[i] ?? CircleHelp
              return (
                <li key={item} className="card flex gap-3">
                  <Icon aria-hidden="true" className="h-7 w-7 shrink-0 text-teal-dark" />
                  <p className="text-ink">{item}</p>
                </li>
              )
            })}
          </ul>
          <p className="mt-6 rounded-2xl bg-navy p-5 text-xl font-semibold text-white">{h.bridge}</p>
        </div>
      </section>

      {/* ---------- Jobs teaser ---------- */}
      <section aria-labelledby="home-jobs-title" className="bg-bg">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 id="home-jobs-title" className="flex items-center gap-3 text-3xl font-bold text-navy">
              <UsersRound aria-hidden="true" className="h-8 w-8 text-teal-dark" />
              {h.jobsTitle}
            </h2>
            <p className="mt-3 text-lg text-ink">{h.jobsText}</p>
          </div>
          <a
            href="/jobs"
            onClick={(e) => go(e, 'jobs')}
            className="tap inline-flex items-center justify-center gap-2 self-start rounded-full bg-navy px-6 font-bold text-white hover:bg-glacier md:self-center"
          >
            {h.jobsCta}
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </a>
        </div>
      </section>
    </main>
  )
}
