import { useRef, useState, type FormEvent } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { api } from '../../api/client'
import type { RouteToday, WaterCheck, WaterCheckIn } from '../../api/types'
import { useOperationsText } from '../../i18n/operations'
import { useAppStore } from '../../store/useAppStore'
import { buttonClass, ErrorNotice, Field, inputClass, localTime } from './Controls'

export function WaterChecksPanel({ route, onChange, cached }: { route: RouteToday; onChange: () => void; cached: boolean }) {
  const t = useOperationsText()
  const staff = useAppStore(s => !!s.staffPin)
  const [house, setHouse] = useState(route.water_checks.some(p => p.household_id === 'C-12') ? 'C-12' : route.water_checks[0]?.household_id ?? '')
  const [checkpoint, setCheckpoint] = useState<'source' | 'drop_point'>('source')
  const [reviewer, setReviewer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)
  const eventId = useRef(crypto.randomUUID())
  const pair = route.water_checks.find(p => p.household_id === house)
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true); setError(false); setSaved(false)
    try { await action(); onChange(); setSaved(true) } catch { setError(true) } finally { setBusy(false) }
  }
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const body: WaterCheckIn = { event_id: eventId.current, checkpoint, truck_id: route.truck.id, run_id: route.run_id,
      household_id: checkpoint === 'drop_point' ? house : null, sampled_at: new Date(String(f.get('sampled'))).toISOString(),
      collector: String(f.get('collector')).trim(), parameter: String(f.get('parameter')).trim(), value: Number(f.get('value')),
      units: String(f.get('units')).trim(), method: String(f.get('method')).trim() || null }
    void mutate(async () => { await api.createWaterCheck(body); eventId.current = crypto.randomUUID() })
  }
  function readings(checks: WaterCheck[]) {
    return !checks.length ? <p>{t.noReading}</p> : <ul className="space-y-3">{checks.map(c => <li key={c.event_id} className="space-y-1">
      <p className="font-semibold">{c.parameter}: {c.value} {c.units}</p>
      <p>{t.sampled}: {new Date(c.sampled_at).toLocaleString()}</p><p>{t.collector}: {c.collector}</p>
      <p>{t.method}: {c.method ?? t.unspecified}</p>
      <p className="flex items-center gap-2 font-semibold">{c.review_status === 'reviewed' ? <CircleCheck aria-hidden="true" className="h-5 w-5" /> : <TriangleAlert aria-hidden="true" className="h-5 w-5" />}{t[c.review_status]}</p>
      {c.reviewed_by && <p>{t.reviewer}: {c.reviewed_by} · {new Date(c.reviewed_at!).toLocaleString()}</p>}
      {staff && <div className="flex flex-wrap gap-2">
        <button className={buttonClass} disabled={busy || cached || !reviewer.trim()} onClick={() => void mutate(() => api.reviewWaterCheck(c.event_id, { review_status: 'reviewed', reviewed_by: reviewer.trim() }))}>{t.review}</button>
        <button className={buttonClass} disabled={busy || cached || !reviewer.trim()} onClick={() => void mutate(() => api.reviewWaterCheck(c.event_id, { review_status: 'follow_up', reviewed_by: reviewer.trim() }))}>{t.followUp}</button>
      </div>}
    </li>)}</ul>
  }
  return <section className="card space-y-4" aria-labelledby="water-checks-title">
    <h2 id="water-checks-title" className="text-2xl font-bold text-navy">{t.quality}</h2>
    <p>{t.qualityNote}</p><p className="text-slate-700">{t.run}: {route.run_id}</p>
    {error && <ErrorNotice />}{saved && <p role="status">{t.saved}</p>}{cached && <p>{t.cached}</p>}
    {!staff && <p>{t.staff}</p>}
    {route.water_checks.length ? <>
      <Field label={t.household}><select className={inputClass} value={house} onChange={e => setHouse(e.target.value)}>{route.water_checks.map(p => <option value={p.household_id} key={p.household_id}>{p.household_id}{p.flags.length ? ` · ${t.reviewNeeded}` : ` · ${t.checksReviewed}`}</option>)}</select></Field>
      {staff && <Field label={t.reviewer}><input className={inputClass} value={reviewer} maxLength={100} onChange={e => setReviewer(e.target.value)} /></Field>}
      {pair && <>
        {!!pair.flags.length && <ul className="space-y-1 text-status-boil">{pair.flags.map(f => <li className="flex items-center gap-2" key={f}><TriangleAlert aria-hidden="true" className="h-5 w-5" />{t[f]}</li>)}</ul>}
        <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><h3 className="text-xl font-bold text-navy">{t.source}</h3>{readings(pair.source)}</div><div className="space-y-2"><h3 className="text-xl font-bold text-navy">{t.drop_point} · {house}</h3>{readings(pair.drop_point)}</div></div>
      </>}
    </> : <p>{t.noChecks}</p>}
    <details><summary className="tap cursor-pointer py-3 font-bold text-navy">{t.recordCheck}</summary>
      <form onSubmit={create}><fieldset disabled={!staff || busy || cached} className="grid gap-3 sm:grid-cols-2">
        <Field label={t.checkpoint}><select className={inputClass} value={checkpoint} onChange={e => setCheckpoint(e.target.value as typeof checkpoint)}><option value="source">{t.source}</option><option value="drop_point" disabled={!house}>{t.drop_point}</option></select></Field>
        <Field label={t.sampled}><input className={inputClass} name="sampled" type="datetime-local" required defaultValue={localTime()} /></Field>
        <Field label={t.collector}><input className={inputClass} name="collector" required maxLength={100} /></Field>
        <Field label={t.parameter}><input className={inputClass} name="parameter" required maxLength={100} defaultValue="Free chlorine (sample)" /></Field>
        <Field label={t.value}><input className={inputClass} name="value" type="number" step="any" required defaultValue={0.4} /></Field>
        <Field label={t.units}><input className={inputClass} name="units" required maxLength={60} defaultValue="mg/L" /></Field>
        <Field label={t.method}><input className={inputClass} name="method" maxLength={200} /></Field>
        <button className={buttonClass} type="submit">{busy ? t.saving : t.save}</button>
      </fieldset></form>
    </details>
  </section>
}
