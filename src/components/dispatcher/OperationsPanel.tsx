import type { MouseEvent } from 'react'
import { ArrowRight, CircleCheckBig, CloudUpload, Droplet, FlaskConical, Siren, Truck, TriangleAlert, UserRound } from 'lucide-react'
import { medianResponse, visitServiceOf, type OperationsView, type RequestService, type VisitService } from '../../api/operations'
import { useT } from '../../i18n'
import { useOpsT } from '../../i18n/features/operations'
import { useFormat } from '../../i18n/format'
import { useAppStore } from '../../store/useAppStore'

function ServiceLabel({ service }: { service: RequestService | VisitService }) {
  const o = useOpsT()
  const sewage = service !== 'water'
  const Icon = sewage ? Siren : Droplet
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${sewage ? 'text-status-nodrink' : 'text-teal-dark'}`}>
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span className="text-ink">{o.services[service]}</span>
    </span>
  )
}

/** Open requests (#2): report time, household, service type; offline completions shown as pending. */
export function OpenRequests({ ops }: { ops: OperationsView }) {
  const o = useOpsT()
  const fmt = useFormat()
  const pendingKeys = new Set(ops.pending.map((p) => `${p.household_id}:${p.service}`))
  const requests = [...ops.open_requests].sort((a, b) => a.reported_at.localeCompare(b.reported_at))

  return (
    <section aria-labelledby="ops-requests" className="card">
      <h2 id="ops-requests" className="text-xl font-bold text-navy">
        {o.requestsTitle}
      </h2>
      {requests.length === 0 ? (
        <p className="mt-2 text-slate-600">{o.noRequests}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {requests.map((r) => {
            const pending = pendingKeys.has(`${r.household_id}:${visitServiceOf(r.service)}`)
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-3">
                    <span className="text-lg font-bold text-navy">{r.household_id}</span>
                    <ServiceLabel service={r.service} />
                  </p>
                  <p className="text-slate-600">
                    {o.reported(`${fmt.day(r.reported_at)}, ${fmt.time(r.reported_at)}`)} · {o.sources[r.source]}
                  </p>
                </div>
                {pending && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-glacier/10 px-3 py-1 font-semibold text-glacier" title={o.pendingNote}>
                    <CloudUpload aria-hidden="true" className="h-5 w-5" />
                    {o.pending}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** Service history (#2): last visit, visit count, and measured response time by service. */
export function ServiceHistoryCard({ ops }: { ops: OperationsView }) {
  const o = useOpsT()
  const fmt = useFormat()
  const latestResponse = (hid: string, service: VisitService) =>
    ops.completed.find((c) => c.household_id === hid && c.service === service && c.response_minutes !== null)?.response_minutes ?? null
  const rows = [...ops.history].sort((a, b) => b.last_visit.localeCompare(a.last_visit))

  return (
    <section aria-labelledby="ops-history" className="card">
      <h2 id="ops-history" className="text-xl font-bold text-navy">
        {o.historyTitle}
      </h2>

      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(['water', 'sewage'] as const).map((s) => {
          const m = medianResponse(ops.completed, s)
          return (
            <div key={s} className="rounded-xl border border-slate-200 p-3">
              <dt>
                <ServiceLabel service={s} />
              </dt>
              <dd className="mt-1">
                <span className="text-slate-600">{o.medianTitle}: </span>
                <span className="font-bold text-navy">{m === null ? o.medianNone : o.minutes(m)}</span>
              </dd>
            </div>
          )
        })}
      </dl>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left">
          <thead>
            <tr className="border-b-2 border-slate-200 text-slate-600">
              <th scope="col" className="py-2 pr-3 font-semibold">{o.cols.household}</th>
              <th scope="col" className="py-2 px-3 font-semibold">{o.cols.service}</th>
              <th scope="col" className="py-2 px-3 font-semibold">{o.cols.last}</th>
              <th scope="col" className="py-2 px-3 font-semibold text-right">{o.cols.count}</th>
              <th scope="col" className="py-2 pl-3 font-semibold">{o.cols.response}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => {
              const r = latestResponse(h.household_id, h.service)
              return (
                <tr key={`${h.household_id}-${h.service}`} className="border-b border-slate-100">
                  <th scope="row" className="py-2 pr-3 font-bold text-navy">{h.household_id}</th>
                  <td className="py-2 px-3"><ServiceLabel service={h.service} /></td>
                  <td className="py-2 px-3">{fmt.day(h.last_visit)}, {fmt.time(h.last_visit)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{h.visit_count}</td>
                  <td className="py-2 pl-3">{r === null ? '—' : o.minutes(r)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h3 className="mt-4 font-bold text-navy">{o.completedTitle}</h3>
      <ul className="mt-1 space-y-1">
        {ops.completed.slice(0, 5).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-2 text-ink">
            <CircleCheckBig aria-hidden="true" className="h-5 w-5 text-status-safe" />
            <span>{o.completedLine(c.household_id, o.services[c.service], c.truck_id.replace('T', 'Truck '), `${fmt.day(c.completed_at)}, ${fmt.time(c.completed_at)}`)}</span>
            <span className="text-slate-600">· {c.response_minutes === null ? o.noLinkedRequest : o.responseTime(o.minutes(c.response_minutes))}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Coverage card (#2): drivers available/standby, trucks in service, 500-household coverage assumption. */
export function CoverageCard({ ops }: { ops: OperationsView }) {
  const t = useT()
  const o = useOpsT()
  const fmt = useFormat()
  const navigate = useAppStore((s) => s.navigate)
  const c = ops.coverage
  const covered = c.water_households_covered ?? Math.min(c.trucks_in_service * c.households_per_truck, c.water_households_total)

  return (
    <section aria-labelledby="ops-coverage" className="card">
      <h2 id="ops-coverage" className="text-xl font-bold text-navy">
        {o.coverageTitle}
      </h2>
      <ul className="mt-3 space-y-2">
        <li className="flex items-center gap-2">
          <UserRound aria-hidden="true" className="h-5 w-5 text-navy" />
          <span className="text-lg font-semibold">{o.driversAvailable(c.drivers_available, c.drivers_needed)}</span>
        </li>
        <li className="flex flex-wrap items-center gap-x-3 pl-7 text-slate-700">
          <span>{o.driversStandby(c.drivers_standby)}</span>
          <span>· {o.driversAbsent(c.drivers_absent)}</span>
        </li>
        <li className="flex items-center gap-2">
          <Truck aria-hidden="true" className="h-5 w-5 text-navy" />
          <span>{o.trucks(c.trucks_in_service, c.trucks_total)}</span>
        </li>
        <li className="pl-7 text-slate-700">{o.coveredHouseholds(fmt.number(covered), fmt.number(c.water_households_total))}</li>
      </ul>
      <p className={`mt-3 flex items-start gap-2 rounded-xl border-2 p-3 font-semibold ${c.shortfall ? 'border-status-boil bg-amber-50 text-status-boil' : 'border-status-safe bg-green-50 text-status-safe'}`}>
        {c.shortfall ? <TriangleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /> : <CircleCheckBig aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />}
        {c.shortfall ? o.shortfall : o.noShortfall}
      </p>
      <p className="mt-3 text-slate-600">{c.assumption ?? o.assumption(c.households_per_truck)}</p>
      <a
        href="/jobs"
        onClick={(e: MouseEvent) => {
          e.preventDefault()
          navigate('jobs')
        }}
        className="tap mt-2 flex items-center gap-2 font-semibold text-glacier underline-offset-4 hover:underline"
      >
        {t.jobs.staffingLink}
        <ArrowRight aria-hidden="true" className="h-5 w-5" />
      </a>
    </section>
  )
}

export function SampleOpsBadge() {
  const o = useOpsT()
  return (
    <p className="inline-flex items-center gap-2 self-start rounded-full border border-status-boil bg-amber-50 px-3 py-1 font-semibold text-status-boil">
      <FlaskConical aria-hidden="true" className="h-5 w-5" />
      {o.sampleBadge}
    </p>
  )
}
