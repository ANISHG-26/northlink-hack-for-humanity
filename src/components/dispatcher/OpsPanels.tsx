import type { MouseEvent } from 'react'
import { ArrowRight, Calculator, CircleCheck, Radio, Truck, UserRound, Waves } from 'lucide-react'
import type { Dashboard } from '../../api/types'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/useAppStore'

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

/** Drivers available today vs needed, linking to Jobs & Training. */
export function StaffingCard({ data }: { data: Dashboard }) {
  const t = useT()
  const j = t.jobs
  const navigate = useAppStore((s) => s.navigate)
  const s = data.staffing
  const short = Math.max(s.drivers_needed - s.drivers_available, 0)
  return (
    <section aria-labelledby="staffing-heading" className="card">
      <h2 id="staffing-heading" className="text-xl font-bold text-navy">
        {j.staffingTitle}
      </h2>
      <ul className="mt-3 space-y-2">
        <li className="flex items-center gap-2">
          <UserRound aria-hidden="true" className="h-5 w-5 text-navy" />
          <span className="text-lg font-semibold">{j.staffingDrivers(s.drivers_available, s.drivers_needed)}</span>
        </li>
        <li className="flex items-center gap-2">
          <Truck aria-hidden="true" className="h-5 w-5 text-navy" />
          <span>{j.staffingTrucks(s.trucks_in_service, s.trucks_total)}</span>
        </li>
      </ul>
      {short > 0 && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-status-boil bg-amber-50 px-3 py-1 font-semibold text-status-boil">
          <UserRound aria-hidden="true" className="h-5 w-5" />
          {j.staffingShort(short)}
        </p>
      )}
      <a
        href="/jobs"
        onClick={(e: MouseEvent) => {
          e.preventDefault()
          navigate('jobs')
        }}
        className="tap mt-3 flex items-center gap-2 font-semibold text-glacier underline-offset-4 hover:underline"
      >
        {j.staffingLink}
        <ArrowRight aria-hidden="true" className="h-5 w-5" />
      </a>
    </section>
  )
}
