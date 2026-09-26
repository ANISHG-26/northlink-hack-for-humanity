import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CircleCheckBig, CircleHelp, ClipboardCheck, FlaskConical, Lock, TriangleAlert } from 'lucide-react'
import { waterChecksApi, type Checkpoint, type ReviewStatus, type WaterCheck, type WaterChecksResponse } from '../../api/waterChecks'
import { useWaterChecksT } from '../../i18n/features/waterChecks'
import { useFormat } from '../../i18n/format'
import { useAppStore } from '../../store/useAppStore'

function ReviewBadge({ status }: { status: ReviewStatus }) {
  const w = useWaterChecksT()
  const style =
    status === 'reviewed'
      ? { Icon: CircleCheckBig, cls: 'border-status-safe bg-green-50 text-status-safe' }
      : status === 'needs_follow_up'
        ? { Icon: TriangleAlert, cls: 'border-status-nodrink bg-red-50 text-status-nodrink' }
        : { Icon: CircleHelp, cls: 'border-status-boil bg-amber-50 text-status-boil' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 font-semibold ${style.cls}`}>
      <style.Icon aria-hidden="true" className="h-4 w-4" />
      {w.status[status]}
    </span>
  )
}

/** Source and drop-point readings side by side per truck run (#8). Record-and-review only. */
export function WaterChecks() {
  const w = useWaterChecksT()
  const fmt = useFormat()
  const staff = useAppStore((s) => s.staffPin !== null)
  const [data, setData] = useState<WaterChecksResponse | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  // form
  const [runId, setRunId] = useState('')
  const [checkpoint, setCheckpoint] = useState<Checkpoint>('drop_point')
  const [household, setHousehold] = useState('')
  const [parameter, setParameter] = useState('Free chlorine')
  const [value, setValue] = useState('')
  const [units, setUnits] = useState('mg/L')

  const load = useCallback(async () => {
    try {
      const res = await waterChecksApi.list()
      setData(res)
      setRunId((r) => r || res.runs[0]?.run_id || '')
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function review(id: string, status: ReviewStatus) {
    setBusy(true)
    try {
      await waterChecksApi.review(id, status)
      await load()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await waterChecksApi.log({
        checkpoint,
        run_id: runId,
        household_id: checkpoint === 'drop_point' ? household : undefined,
        collector: 'Community Water Monitor',
        parameter,
        value: value === '' ? undefined : Number(value),
        units: units || undefined,
        method: 'Test kit',
      })
      setHousehold('')
      setValue('')
      await load()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const reading = (c: WaterCheck) => (
    <div key={c.id} className="rounded-lg bg-bg p-2">
      <p className="font-semibold text-ink">{w.reading(c.parameter, c.value === null ? w.noValue : String(c.value), c.units ?? '')}</p>
      <p className="text-slate-600">{w.by(c.collector, fmt.time(c.sampled_at))}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <ReviewBadge status={c.review_status} />
        {staff && c.review_status !== 'reviewed' && (
          <button type="button" disabled={busy} onClick={() => review(c.id, 'reviewed')} className="btn btn-outline btn-sm">
            {w.markReviewed}
          </button>
        )}
        {staff && c.review_status === 'unreviewed' && (
          <button type="button" disabled={busy} onClick={() => review(c.id, 'needs_follow_up')} className="btn btn-outline btn-sm">
            {w.followUp}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <section aria-labelledby="water-checks-heading" className="card">
      <h2 id="water-checks-heading" className="flex items-center gap-2 text-xl font-bold text-navy">
        <FlaskConical aria-hidden="true" className="h-6 w-6 text-teal-dark" />
        {w.title}
      </h2>
      <p className="mt-1 text-slate-600">{w.intro}</p>
      {data && <p className="mt-1 text-slate-500">{data.thresholds_note}</p>}
      <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-status-boil bg-amber-50 px-3 py-0.5 font-semibold text-status-boil">
        <FlaskConical aria-hidden="true" className="h-4 w-4" />
        {w.sample}
      </p>
      {!staff && (
        <p className="mt-2 flex items-center gap-2 text-slate-600">
          <Lock aria-hidden="true" className="h-5 w-5" />
          {w.staffOnly}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 flex items-center gap-2 font-semibold text-status-nodrink">
          <TriangleAlert aria-hidden="true" className="h-5 w-5" />
          {w.error}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-4">
        {data?.runs.map((run) => (
          <li key={run.run_id} className={`rounded-xl border-2 p-4 ${run.needs_review ? 'border-status-boil' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-navy">{w.run(run.truck_id.replace('T', 'Truck '), fmt.date(run.date))}</h3>
              {run.needs_review ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-status-boil">
                  <TriangleAlert aria-hidden="true" className="h-5 w-5" />
                  {w.needsReview}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-status-safe">
                  <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
                  {w.complete}
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr]">
              <div>
                <h4 className="font-semibold text-slate-600">{w.source}</h4>
                {run.missing_source ? (
                  <p className="mt-1 flex items-center gap-2 font-semibold text-status-boil">
                    <TriangleAlert aria-hidden="true" className="h-5 w-5" />
                    {w.missingSource}
                  </p>
                ) : (
                  <div className="mt-1 flex flex-col gap-2">{run.source.map(reading)}</div>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-slate-600">{w.dropPoints}</h4>
                <ul className="mt-1 grid gap-2 sm:grid-cols-2">
                  {run.drop_points.map((dp) => (
                    <li key={dp.household_id} className={`rounded-lg border p-2 ${dp.missing ? 'border-status-boil' : 'border-slate-200'}`}>
                      <p className="font-bold text-navy">{dp.household_id}</p>
                      {dp.missing ? (
                        <p className="flex items-center gap-2 font-semibold text-status-boil">
                          <TriangleAlert aria-hidden="true" className="h-4 w-4" />
                          {w.missing}
                        </p>
                      ) : (
                        <div className="mt-1 flex flex-col gap-2">{dp.checks.map(reading)}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
        <h3 className="font-bold text-navy sm:col-span-3">{w.log}</h3>
        <label className="flex flex-col gap-1 font-semibold text-navy">
          {w.runLabel}
          <select value={runId} onChange={(e) => setRunId(e.target.value)} className="tap rounded-xl border-2 border-slate-300 bg-white px-3 font-normal">
            {data?.runs.map((r) => (
              <option key={r.run_id} value={r.run_id}>
                {w.run(r.truck_id.replace('T', 'Truck '), fmt.date(r.date))}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-semibold text-navy">
          {w.checkpoint}
          <select value={checkpoint} onChange={(e) => setCheckpoint(e.target.value as Checkpoint)} className="tap rounded-xl border-2 border-slate-300 bg-white px-3 font-normal">
            <option value="source">{w.checkpoints.source}</option>
            <option value="drop_point">{w.checkpoints.drop_point}</option>
          </select>
        </label>
        {checkpoint === 'drop_point' && (
          <label className="flex flex-col gap-1 font-semibold text-navy">
            {w.household}
            <input value={household} onChange={(e) => setHousehold(e.target.value)} required placeholder="C-21" className="tap rounded-xl border-2 border-slate-300 px-3 font-normal uppercase" />
          </label>
        )}
        <label className="flex flex-col gap-1 font-semibold text-navy">
          {w.parameter}
          <input value={parameter} onChange={(e) => setParameter(e.target.value)} required className="tap rounded-xl border-2 border-slate-300 px-3 font-normal" />
        </label>
        <label className="flex flex-col gap-1 font-semibold text-navy">
          {w.value}
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className="tap rounded-xl border-2 border-slate-300 px-3 font-normal" />
        </label>
        <label className="flex flex-col gap-1 font-semibold text-navy">
          {w.units}
          <input value={units} onChange={(e) => setUnits(e.target.value)} className="tap rounded-xl border-2 border-slate-300 px-3 font-normal" />
        </label>
        <div className="flex items-end sm:col-span-3">
          <button type="submit" disabled={busy || !runId} className="btn btn-dark">
            <FlaskConical aria-hidden="true" className="h-5 w-5" />
            {w.submit}
          </button>
        </div>
      </form>
    </section>
  )
}
