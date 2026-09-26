import type { KeyboardEvent } from 'react'
import { Home, Truck, LayoutDashboard, Wrench } from 'lucide-react'
import { useT } from '../i18n'
import { useAppStore, type View } from '../store/useAppStore'

const TABS: { id: View; Icon: typeof Home }[] = [
  { id: 'resident', Icon: Home },
  { id: 'driver', Icon: Truck },
  { id: 'dispatcher', Icon: LayoutDashboard },
  { id: 'parts', Icon: Wrench },
]

export function Tabs() {
  const t = useT()
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = TABS[(i + delta + TABS.length) % TABS.length].id
    setView(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div role="tablist" className="max-w-5xl mx-auto px-2 flex overflow-x-auto">
        {TABS.map(({ id, Icon }, i) => {
          const active = id === view
          return (
            <button
              key={id}
              id={`tab-${id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setView(id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`tap flex-1 min-w-[6.5rem] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-2 font-semibold border-b-4 transition-colors ${
                active ? 'border-teal text-navy' : 'border-transparent text-slate-600 hover:text-navy'
              }`}
            >
              <Icon aria-hidden="true" className="h-6 w-6" />
              {t.tabs[id]}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
