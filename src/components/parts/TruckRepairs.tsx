import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CircleCheckBig, Clock, Package, TriangleAlert, Truck, Wrench } from 'lucide-react'
import { breakdownsApi, type Breakdown, type BreakdownsResponse, type Cause, type RepairStatus } from '../../api/breakdowns'
import type { Part } from '../../api/types'
import { useBreakdownsT } from '../../i18n/features/breakdowns'
import { useFormat } from '../../i18n/format'

const CAUSES: Cause[] = ['unknown', 'wear', 'freezing', 'damage', 'electrical', 'other']
const NEXT: Record<RepairStatus, RepairStatus[]> = {
  open: ['waiting_parts', 'in_repair', 'fixed'],
  waiting_parts: ['in_repair', 'fixed'],
  in_repair: ['fixed'],
  fixed: [],
}

function StatusBadge({ status }: { status: RepairStatus }) {
  const b = useBreakdownsT()
  const fixed = status === 'fixed'
  const Icon = fixed ? CircleCheckBig : Wrench
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-0.5 font-semibold ${
        fixed ? 'border-status-safe bg-green-50 text-status-safe' : 'border-status-boil bg-amber-50 text-status-boil'
      }`}
    >
      <Icon aria-hidden="true" className="h-5 w-5" />
      {b.status[status]}
    </span>
  )
}

/** Truck breakdowns tied to parts stock and coverage (#7). */
export function TruckRepairs({ parts }: { parts: Part[] }) {
  const b = useBreakdownsT()
  const fmt = useFormat()
  const [data, setData] = useState<BreakdownsResponse | null>(null)
  const [error, setError] = useState(false)
  const [truck, setTruck] = useState('T2')
  const [part, setPart] = useState('')
  const [symptom, setSymptom] = useState('')
  const [cause, setCause] = useState<Cause>('unknown')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await breakdownsApi.list())
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await breakdownsApi.report({ truck_id: truck, part_id: part || undefined, symptom, cause })
      setSymptom('')
      setPart('')
      setCause('unknown')
      await load()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  async function move(item: Breakdown, status: RepairStatus) {
    setBusy(true)
    try {
      await breakdownsApi.setStatus(item.id, status)
      await load()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const when = (iso: string) => `${fmt.day(iso)}, ${fmt.time(iso)}`

  return (
    <section aria-labelledby="repairs-heading" className="card">
      <h2 id="repairs-heading" className="flex items-center gap-2 text-xl font-bold text-navy">
        <Wrench aria-hidden="true" className="h-6 w-6 text-teal-dark" />
        {b.title}
      </h2>
      <p className="mt-1 text-slate-600">{b.intro}</p>

      {data && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="inline-flex items-center gap-2 font-semibold text-navy">
            <Truck aria-hidden="true" className="h-5 w-5" />
            {b.coverage(data.trucks_in_service, data.trucks_total)}
          </p>
          {data.trucks.map((t) => (
            <span
              key={t.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 font-semibold ${
                t.status === 'in_service' ? 'bg-green-50 text-status-safe' : 'bg-amber-50 text-status-boil'
              }`}
            >
              {t.status === 'in_service' ? <CircleCheckBig aria-hidden="true" className="h-4 w-4" /> : <Wrench aria-hidden="true" className="h-4 w-4" />}
              {t.name}: {b.truckStatus[t.status]}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-2 font-semibold text-status-nodrink">
          <TriangleAlert aria-hidden="true" className="h-5 w-5" />
          {b.error}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {data?.breakdowns.length === 0 && <li className="text-slate-600">{b.none}</li>}
        {data?.breakdowns.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-bold text-navy">
                {item.truck_name} · {item.part_name ?? b.noPart}
              </p>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-1 text-ink">{item.symptom}</p>
            <p className="mt-1 text-slate-700">
              {b.cause}: <span className="font-semibold">{b.causes[item.cause]}</span> ({item.cause_confirmed ? b.causeConfirmed : b.causeNotConfirmed})
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="h-4 w-4" />
                {b.opened(when(item.opened_at))}
              </span>
              {item.fixed_at && <span>· {b.fixed(when(item.fixed_at))}</span>}
            </p>
            {item.downtime_minutes !== null && (
              <p className="mt-1 font-semibold text-status-safe">{b.downtime(b.duration(item.downtime_minutes))}</p>
            )}
            {item.stock_on_hand !== null && (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-slate-700">
                <Package aria-hidden="true" className="h-4 w-4" />
                {b.stock(item.stock_on_hand)} · {item.reorder_needed ? b.reorder : b.noReorder}
              </p>
            )}
            {item.status !== 'fixed' && <p className="mt-1 text-slate-500">{b.contacts}</p>}
            {NEXT[item.status].length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {NEXT[item.status].map((s) => (
                  <button key={s} type="button" disabled={busy} onClick={() => move(item, s)} className="btn btn-outline btn-sm">
                    {b.mark(b.status[s])}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <h3 className="font-bold text-navy sm:col-span-2">{b.log}</h3>
        <label className="flex flex-col gap-1 font-semibold text-navy">
          {b.truck}
          <select value={truck} onChange={(e) => setTruck(e.target.value)} className="tap rounded-xl border-2 border-slate-300 bg-white px-3 font-normal">
            {(data?.trucks ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-semibold text-navy">
          {b.part}
          <select value={part} onChange={(e) => setPart(e.target.value)} className="tap rounded-xl border-2 border-slate-300 bg-white px-3 font-normal">
            <option value="">{b.noPart}</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-semibold text-navy sm:col-span-2">
          {b.symptom}
          <input value={symptom} onChange={(e) => setSymptom(e.target.value)} required className="tap rounded-xl border-2 border-slate-300 px-3 font-normal" />
        </label>
        <label className="flex flex-col gap-1 font-semibold text-navy">
          {b.cause}
          <select value={cause} onChange={(e) => setCause(e.target.value as Cause)} className="tap rounded-xl border-2 border-slate-300 bg-white px-3 font-normal">
            {CAUSES.map((c) => (
              <option key={c} value={c}>
                {b.causes[c]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={busy || !symptom.trim()} className="btn btn-dark w-full">
            <Wrench aria-hidden="true" className="h-5 w-5" />
            {b.submit}
          </button>
        </div>
      </form>
    </section>
  )
}
