import { Calculator, CircleCheck, Radio, Waves } from 'lucide-react'
import type { Dashboard } from '../../api/types'
import { useT } from '../../i18n'

/** How tank levels are known (sensor vs estimated) and possible leaks. */
export function SensorCoverage({ data }: { data: Dashboard }) {
  const t = useT()
  const d = t.dispatcher
  return (
    <section aria-labelledby="coverage-heading" className="card">
      <h2 id="coverage-heading" className="text-xl font-bold text-navy">
        {d.sensorsTitle}
      </h2>
      <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className="h-full rounded-full bg-accent" style={{ width: `${data.sensor_pct}%` }} />
      </div>
      <ul className="mt-3 space-y-1">
        <li className="flex items-center gap-2 font-semibold text-teal-dark">
          <Radio aria-hidden="true" className="h-5 w-5" />
          <span className="text-ink">{d.sensorsHomes(data.sensor_homes, data.sensor_pct)}</span>
        </li>
        <li className="flex items-center gap-2 font-semibold text-slate-600">
          <Calculator aria-hidden="true" className="h-5 w-5" />
          <span className="text-ink">{d.estimatedHomes(data.estimated_homes)}</span>
        </li>
      </ul>
      <h3 className="mt-4 font-bold text-navy">{d.leaksTitle}</h3>
      {data.possible_leaks.length === 0 ? (
        <p className="mt-1 flex items-center gap-2 text-status-safe font-semibold">
          <CircleCheck aria-hidden="true" className="h-5 w-5" />
          {d.noLeaks}
        </p>
      ) : (
        <ul className="mt-1 space-y-2">
          {data.possible_leaks.map((l) => (
            <li key={l.household_id} className="flex items-start gap-2 rounded-xl border-2 border-status-nodrink/40 bg-red-50 p-3">
              <Waves aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-status-nodrink" />
              <span>
                <span className="font-bold text-ink">{d.leakLine(l.household_id, String(Math.round(l.litres_lost)))}</span>
                <span className="block text-slate-700">{l.note}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
