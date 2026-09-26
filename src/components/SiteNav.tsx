import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Briefcase, Home, LayoutDashboard, Menu, Truck, Wrench, X } from 'lucide-react'
import { useT } from '../i18n'
import { useAppStore, type View } from '../store/useAppStore'
import { LanguageToggle } from './LanguageToggle'
import { LogoMark } from './Logo'
import { OnlineIndicator } from './OnlineIndicator'

const LINKS: { id: Exclude<View, 'home'>; Icon: typeof Home }[] = [
  { id: 'resident', Icon: Home },
  { id: 'driver', Icon: Truck },
  { id: 'dispatcher', Icon: LayoutDashboard },
  { id: 'parts', Icon: Wrench },
  { id: 'jobs', Icon: Briefcase },
]

/**
 * Site header + navigation. `variant="hero"` sits over the landing hero (transparent);
 * `variant="app"` is the solid navy bar for inner views. Hamburger menu below `lg`.
 */
export function SiteNav({ variant }: { variant: 'hero' | 'app' }) {
  const t = useT()
  const view = useAppStore((s) => s.view)
  const navigate = useAppStore((s) => s.navigate)
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  useEffect(() => setOpen(false), [view])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        menuButton.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function go(e: MouseEvent, v: View) {
    e.preventDefault()
    navigate(v)
  }

  const hero = variant === 'hero'
  const linkBase = 'tap inline-flex items-center gap-2 rounded-full px-4 font-semibold transition-colors'

  return (
    <header className={hero ? 'absolute inset-x-0 top-0 z-20' : 'bg-navy text-white sticky top-0 z-20 shadow'}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-navy">
        {t.nav.skip}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <a
          href="/"
          onClick={(e) => go(e, 'home')}
          className={`tap inline-flex items-center gap-2 rounded-xl pr-2 ${hero ? 'text-white' : 'text-white'}`}
          aria-label={`Northlink, ${t.nav.home}`}
        >
          <span className="rounded-xl bg-white p-1 shadow-sm">
            <LogoMark className="h-8 w-7" />
          </span>
          <span className="text-xl font-bold tracking-tight">
            North<span className="text-sky-accent">Link</span>
          </span>
        </a>

        <nav aria-label={t.nav.mainNav} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {LINKS.map(({ id, Icon }) => {
              const active = view === id
              return (
                <li key={id}>
                  <a
                    href={`/${id}`}
                    onClick={(e) => go(e, id)}
                    aria-current={active ? 'page' : undefined}
                    className={`${linkBase} ${active ? 'bg-white text-navy' : 'text-white hover:bg-white/15'}`}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                    {t.tabs[id]}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            {!hero && <OnlineIndicator />}
            <LanguageToggle />
          </div>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? t.nav.closeMenu : t.nav.menu}
            className="tap lg:hidden inline-flex items-center justify-center rounded-xl text-white hover:bg-white/15"
          >
            {open ? <X aria-hidden="true" className="h-7 w-7" /> : <Menu aria-hidden="true" className="h-7 w-7" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="site-menu" className="lg:hidden mx-4 mb-3 rounded-2xl bg-navy/95 p-3 text-white shadow-xl backdrop-blur">
          <nav aria-label={t.nav.mainNav}>
            <ul className="flex flex-col gap-1">
              <li>
                <a href="/" onClick={(e) => go(e, 'home')} aria-current={view === 'home' ? 'page' : undefined} className={`${linkBase} w-full ${view === 'home' ? 'bg-white text-navy' : 'hover:bg-white/15'}`}>
                  <Home aria-hidden="true" className="h-5 w-5" />
                  {t.nav.home}
                </a>
              </li>
              {LINKS.map(({ id, Icon }) => (
                <li key={id}>
                  <a
                    href={`/${id}`}
                    onClick={(e) => go(e, id)}
                    aria-current={view === id ? 'page' : undefined}
                    className={`${linkBase} w-full ${view === id ? 'bg-white text-navy' : 'hover:bg-white/15'}`}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                    {t.tabs[id]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/20 pt-3 md:hidden">
            {!hero && <OnlineIndicator />}
            <LanguageToggle />
          </div>
        </div>
      )}
    </header>
  )
}
