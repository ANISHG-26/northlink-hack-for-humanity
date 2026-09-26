import type { MouseEvent } from 'react'
import { useT } from '../i18n'
import { APP_VIEWS, useAppStore, type View } from '../store/useAppStore'
import { Brand } from './Brand'
import { LanguageToggle } from './LanguageToggle'

/** Navy app bar with tabs (reference `.appbar`). Wraps to two rows on phones. */
export function AppBar() {
  const t = useT()
  const view = useAppStore((s) => s.view)
  const navigate = useAppStore((s) => s.navigate)

  function go(e: MouseEvent, v: View) {
    e.preventDefault()
    navigate(v)
  }

  return (
    <header className="appbar">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-navy"
      >
        {t.nav.skip}
      </a>
      <div className="wrap flex-wrap py-2 md:flex-nowrap md:py-0">
        <Brand size={26} />
        <nav className="tabs order-last basis-full md:order-none md:basis-auto" aria-label={t.ref.appNav}>
          {APP_VIEWS.map((id) => (
            <a key={id} href={`/${id}`} onClick={(e) => go(e, id)} aria-current={view === id ? 'page' : undefined}>
              {t.tabs[id]}
            </a>
          ))}
        </nav>
        <LanguageToggle />
      </div>
    </header>
  )
}
