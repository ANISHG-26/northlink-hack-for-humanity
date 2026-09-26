import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { api } from '../api/client'
import { useT } from '../i18n'

export function Footer() {
  const t = useT()
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function reset() {
    setBusy(true)
    try {
      await api.demoReset()
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith('northlink:cache:') || k === 'northlink:queue') localStorage.removeItem(k)
      } catch {
        /* ignore */
      }
      setDone(true)
      window.setTimeout(() => window.location.reload(), 600)
    } catch {
      setBusy(false)
    }
  }

  return (
    <footer className="site-footer">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{t.ref.footer}</p>
        <div className="flex shrink-0 items-center gap-3">
          <span aria-live="polite" className="font-semibold text-status-safe">
            {done ? t.demoResetDone : ''}
          </span>
          <button type="button" onClick={reset} disabled={busy} title={t.demoResetHelp} className="btn btn-outline btn-sm">
            <RotateCcw aria-hidden="true" className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
            {t.demoReset}
          </button>
        </div>
      </div>
    </footer>
  )
}
