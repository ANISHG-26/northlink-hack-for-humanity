import { ChevronDown, Flame, Lock, Megaphone, OctagonX, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { OutbreakAlert, Zone } from '../../api/types'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/useAppStore'

const LOCALES = { en: 'en-CA', fr: 'fr-CA', iu: 'en-CA' } as const

export function OutbreakPanel({ alerts, onIssue }: { alerts: OutbreakAlert[]; onIssue: (zone: Zone) => void }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const staff = useAppStore((s) => s.staffPin !== null)
  const d = t.dispatcher

  function weekday(iso: string) {
    return new Intl.DateTimeFormat(LOCALES[lang], { weekday: 'long' }).format(new Date(`${iso}T12:00:00`))
  }

  return (
    <section aria-labelledby="alerts-heading" className="card">
      <h2 id="alerts-heading" className="text-xl font-bold text-navy flex items-center gap-2">
        <ShieldAlert aria-hidden="true" className="h-6 w-6 text-status-nodrink" />
        {d.alertsTitle}
      </h2>
      <p className="mt-1 text-slate-600">{d.alertsNote}</p>
      {alerts.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-status-safe font-semibold">
          <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          {d.noAlerts}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {alerts.map((a) => {
            const truck = a.shared.truck_id ? t.driver.truck(a.shared.truck_id) : null
            return (
              <li key={a.zone} className="rounded-xl border-2 border-status-nodrink/40 bg-red-50/60 p-4">
                <p className="text-lg font-bold text-ink">
                  {d.alertSummary(a.count, a.zone, a.span_days)}{' '}
                  {a.shared.kind === 'truck_and_day' && truck && a.shared.delivery_date
                    ? d.sharedTruckDay(a.shared.matching, truck, weekday(a.shared.delivery_date))
                    : a.shared.kind === 'truck' && truck
                      ? d.sharedTruck(a.shared.matching, truck)
                      : ''}
                </p>
                {a.water_quality_reports > 0 && <p className="mt-1 text-ink">{d.wqReports(a.water_quality_reports)}</p>}
                <p className="mt-2 font-semibold text-navy">{d.recommended(a.zone, truck)}</p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {a.advisory_active ? (
                    <p className="inline-flex items-center gap-2 rounded-full bg-[#6D28D9] px-3 py-1 font-semibold text-white">
                      {a.advisory_active === 'nodrink' ? (
                        <OctagonX aria-hidden="true" className="h-5 w-5" />
                      ) : (
                        <Flame aria-hidden="true" className="h-5 w-5" />
                      )}
                      {d.advisoryInPlace(t.safety[a.advisory_active])}
                    </p>
                  ) : !staff ? (
                    <p className="inline-flex items-center gap-2 text-slate-600">
                      <Lock aria-hidden="true" className="h-5 w-5" />
                      {t.staff.locked}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onIssue(a.zone)}
                      className="tap inline-flex items-center gap-2 rounded-xl bg-status-boil px-4 font-bold text-white hover:bg-navy"
                    >
                      <Megaphone aria-hidden="true" className="h-5 w-5" />
                      {d.issueFor(a.zone)}
                    </button>
                  )}
                </div>

                <details className="group mt-3 rounded-lg bg-white border border-slate-200">
                  <summary className="tap flex cursor-pointer list-none items-center justify-between gap-2 px-3 font-semibold text-glacier [&::-webkit-details-marker]:hidden">
                    {d.howDetected}
                    <ChevronDown aria-hidden="true" className="h-5 w-5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-3 pb-3">
                    <ol className="list-decimal pl-6 space-y-1 text-slate-700">
                      {a.how_detected.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ol>
                    <p className="mt-2 text-slate-500">{d.homes(a.households.join(', '))}</p>
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
