import { useCallback, useEffect, useState } from 'react'
import { CircleCheckBig, Flame, LoaderCircle, Megaphone, OctagonX, TriangleAlert, X } from 'lucide-react'
import { api } from '../api/client'
import type { Advisory, AttentionItem, Dashboard, OutbreakAlert, Zone } from '../api/types'
import { OfflineBanner } from '../components/OfflineBanner'
import { AdvisoryDialog } from '../components/dispatcher/AdvisoryDialog'
import { AttentionList } from '../components/dispatcher/AttentionList'
import { SensorCoverage, StaffingCard } from '../components/dispatcher/OpsPanels'
import { StaffGate } from '../components/dispatcher/StaffGate'
import { OutbreakPanel } from '../components/dispatcher/OutbreakPanel'
import { SummaryCards } from '../components/dispatcher/SummaryCards'
import { ZoneMap } from '../components/dispatcher/ZoneMap'
import { useT } from '../i18n'
import { useAppStore } from '../store/useAppStore'
import { OperationsPanel } from '../components/operations/OperationsPanel'

const POLL_MS = 15_000

export function DispatcherView() {
  const t = useT()
  const d = t.dispatcher
  const isOnline = useAppStore((s) => s.isOnline)
  const staff = useAppStore((s) => s.staffPin !== null)
  const [attention, setAttention] = useState<AttentionItem[]>([])
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [alerts, setAlerts] = useState<OutbreakAlert[]>([])
  const [advisories, setAdvisories] = useState<Advisory[]>([])
  const [cachedAt, setCachedAt] = useState<string | undefined>()
  const [error, setError] = useState(false)
  const [dialogZone, setDialogZone] = useState<Zone | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [a, b, c, e] = await Promise.all([api.dashboard(), api.outbreaks(), api.advisories(), api.attention()])
      setDash(a.data)
      setAlerts(b.data)
      setAdvisories(c.data)
      setAttention(e.data)
      setCachedAt(a.fromCache ? a.cachedAt : undefined)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(load, POLL_MS)
    return () => window.clearInterval(id)
  }, [load])

  async function lift(zone: Zone) {
    try {
      await api.liftAdvisory(zone)
      setNotice(null)
      await load()
    } catch {
      /* stays listed; user can retry */
    }
  }

  if (!dash) {
    return (
      <div className="card flex items-center justify-center gap-3 py-12" role="status">
        {error ? (
          <>
            <TriangleAlert aria-hidden="true" className="h-6 w-6 text-status-nodrink" />
            {t.loadError}
          </>
        ) : (
          <>
            <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-teal" />
            {t.loading}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {(!isOnline || cachedAt) && <OfflineBanner cachedAt={cachedAt} />}
      <SummaryCards data={dash} />
      <StaffGate />
      <OperationsPanel onChange={() => void load()} />

      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 border-2 border-status-safe p-3 font-semibold text-status-safe">
          <CircleCheckBig aria-hidden="true" className="h-6 w-6 shrink-0" />
          {notice}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] items-start">
        <ZoneMap zones={dash.zones} />
        <div className="flex flex-col gap-5">
          <OutbreakPanel alerts={alerts} onIssue={setDialogZone} />

          <section aria-labelledby="adv-heading" className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="adv-heading" className="text-xl font-bold text-navy">
                {d.active}
              </h2>
              {staff && (
              <button
                type="button"
                onClick={() => setDialogZone('C')}
                className="tap inline-flex items-center gap-2 rounded-xl border-2 border-status-boil px-4 font-semibold text-status-boil hover:bg-amber-50"
              >
                <Megaphone aria-hidden="true" className="h-5 w-5" />
                {d.issue}
              </button>
              )}
            </div>
            {advisories.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100">
                {advisories.map((a) => (
                  <li key={a.zone} className="flex items-center justify-between gap-3 py-2">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#6D28D9]">
                      {a.status === 'nodrink' ? (
                        <OctagonX aria-hidden="true" className="h-5 w-5" />
                      ) : (
                        <Flame aria-hidden="true" className="h-5 w-5" />
                      )}
                      <span className="text-ink">
                        {d.zoneLabel(a.zone)} · {t.safety[a.status]}
                      </span>
                    </span>
                    {staff && (
                    <button
                      type="button"
                      onClick={() => lift(a.zone)}
                      aria-label={d.liftLabel(a.zone)}
                      className="tap inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 text-slate-700 hover:bg-slate-50"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                      {d.lift}
                    </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] items-start">
        <AttentionList items={attention} />
        <div className="flex flex-col gap-5">
          <SensorCoverage data={dash} />
          <StaffingCard data={dash} />
        </div>
      </div>

      {dialogZone && (
        <AdvisoryDialog
          zone={dialogZone}
          onClose={() => setDialogZone(null)}
          onIssued={(z) => {
            setDialogZone(null)
            setNotice(d.dialog.issued(z))
            void load()
          }}
        />
      )}
    </div>
  )
}
