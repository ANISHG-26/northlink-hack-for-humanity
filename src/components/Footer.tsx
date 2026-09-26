import { useState } from 'react'
import { Handshake, Info, RotateCcw } from 'lucide-react'
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
    <footer className="bg-white border-t border-slate-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 text-slate-700">
          <p className="flex items-center gap-2 font-semibold">
            <Info aria-hidden="true" className="h-5 w-5 shrink-0" />
            {t.footer}
          </p>
          <p className="flex items-start gap-2">
            <Handshake aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
            {t.footerKiujik}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span aria-live="polite" className="text-status-safe font-semibold">
            {done ? t.demoResetDone : ''}
          </span>
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            title={t.demoResetHelp}
            className="tap inline-flex items-center gap-2 rounded-full border-2 border-slate-300 px-4 font-semibold text-navy hover:bg-slate-50 disabled:opacity-60"
          >
            <RotateCcw aria-hidden="true" className={`h-5 w-5 ${busy ? 'animate-spin' : ''}`} />
            {t.demoReset}
          </button>
        </div>
      </div>
    </footer>
  )
}
