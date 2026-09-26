import { useCallback, useEffect, useState } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { api } from '../../api/client'
import type { Operations, ReadinessIn } from '../../api/types'
import { useOperationsText } from '../../i18n/operations'
import { useAppStore } from '../../store/useAppStore'
import { buttonClass, ErrorNotice, Field, inputClass } from './Controls'

export function OperationsPanel({ onChange }: { onChange: () => void }) {
  const t = useOperationsText()
  const staff = useAppStore(s => !!s.staffPin)
  const [data, setData] = useState<Operations | null>(null)
  const [cached, setCached] = useState(false)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try { const r = await api.operations(); setData(r.data); setCached(r.fromCache); setError(false) }
    catch { setError(true) }
  }, [])
  useEffect(() => { void load(); const id = window.setInterval(load, 15000); return () => window.clearInterval(id) }, [load])
  async function update(body: ReadinessIn) {
    setBusy(true); setError(false)
    try { setData(await api.readiness(body)); onChange() } catch { setError(true) } finally { setBusy(false) }
  }
  const visits = data?.visits.filter(v => v.visit_count) ?? []
  return <section className="card space-y-4" aria-labelledby="operations-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="operations-title" className="text-2xl font-bold text-navy">{t.operations}</h2>
      <button className={buttonClass} onClick={() => void load()} disabled={busy}>{t.refresh}</button></div>
    {error && <ErrorNotice />}
    {!data ? <p role="status">{t.loading}</p> : <>
      <p className="text-slate-700">{t[data.storage]}</p>
      {cached && <p role="status">{t.cached}</p>}
      <p className={`flex items-center gap-2 font-bold ${data.coverage.shortfall ? 'text-status-boil' : 'text-status-safe'}`}>
        {data.coverage.shortfall ? <TriangleAlert aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}{data.coverage.shortfall ? t.shortfall : t.covered}</p>
      <div className="grid gap-5 sm:grid-cols-2">{[data.coverage.water, data.coverage.sanitation].map(c => <div key={c.service}>
        <h3 className="font-bold text-navy">{t[c.service]}</h3><dl className="space-y-1">
          <div className="flex justify-between gap-2"><dt>{t.available} / {t.standby}</dt><dd>{c.drivers_available} / {c.drivers_standby}</dd></div>
          <div className="flex justify-between gap-2"><dt>{t.trucks}</dt><dd>{c.trucks_in_service}</dd></div>
          <div className="flex justify-between gap-2"><dt>{t.crews}</dt><dd>{c.crews_available} / {c.crews_needed}</dd></div>
        </dl></div>)}</div><p className="text-slate-700">{t.assumption}</p>
      <details><summary className="tap cursor-pointer py-3 font-bold text-navy">{t.readiness}</summary>
        {!staff && <p>{t.staff}</p>}<fieldset disabled={!staff || busy || cached} className="grid gap-3 sm:grid-cols-2">
          {data.drivers.map(d => <Field key={d.id} label={`${d.id} · ${t[d.service]}`}><select className={inputClass} value={d.status} onChange={e => void update({ drivers: { [d.id]: e.target.value as typeof d.status } })}>
            {(['available', 'standby', 'absent'] as const).map(v => <option key={v} value={v}>{t[v]}</option>)}</select></Field>)}
          {data.trucks.map(truck => <Field key={truck.id} label={`${truck.id} · ${t[truck.service]}`}><select className={inputClass} value={truck.status} onChange={e => void update({ trucks: { [truck.id]: e.target.value as typeof truck.status } })}>
            {(['in_service', 'maintenance', 'out_of_service'] as const).map(v => <option key={v} value={v}>{t[v]}</option>)}</select></Field>)}
          <button className={`${buttonClass} sm:col-span-2`} onClick={() => void update({ drivers: { D1: 'absent' }, trucks: { T1: 'out_of_service' } })}>{t.simulate}</button>
        </fieldset></details>
      <h3 className="text-xl font-bold text-navy">{t.requests} ({data.open_requests.length})</h3>
      {!data.open_requests.length ? <p>{t.noRequests}</p> : <ul className="divide-y divide-slate-200">{data.open_requests.map(r => <li key={r.id} className="py-3">
        <strong>{r.household_id} · {t[r.service_type]}</strong><p className="text-slate-700">{t.reported}: {new Date(r.reported_at).toLocaleString()} · {r.source}</p></li>)}</ul>}
      <details><summary className="tap cursor-pointer py-3 font-bold text-navy">{t.history} ({data.completed_requests.length})</summary>
        {!data.completed_requests.length ? <p>{t.noHistory}</p> : <ul className="divide-y divide-slate-200">{data.completed_requests.map(r => <li key={r.id} className="py-3">
          <strong>{r.household_id} · {t[r.service_type]}</strong><p>{t.response}: {Math.round(r.response_seconds! / 60)} {t.minutes} · {new Date(r.completed_at!).toLocaleString()}</p></li>)}</ul>}</details>
      <details><summary className="tap cursor-pointer py-3 font-bold text-navy">{t.visits}</summary>
        {!visits.length ? <p>{t.noVisits}</p> : <ul className="divide-y divide-slate-200">{visits.map(v => <li className="py-3" key={`${v.household_id}-${v.service_type}`}>
          <strong>{v.household_id} · {t[v.service_type]}</strong><p>{t.count}: {v.visit_count} · {t.lastVisit}: {new Date(v.last_visit!).toLocaleString()}</p></li>)}</ul>}</details>
    </>}
  </section>
}
