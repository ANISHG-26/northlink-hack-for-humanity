import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { Breakdown, BreakdownIn, Part, Truck } from '../../api/types'
import { useOperationsText } from '../../i18n/operations'
import { useAppStore } from '../../store/useAppStore'
import { buttonClass, ErrorNotice, Field, inputClass, localTime } from './Controls'

export function RepairsPanel({ onChange }: { onChange: () => void }) {
  const t = useOperationsText()
  const staff = useAppStore(s => !!s.staffPin)
  const [repairs, setRepairs] = useState<Breakdown[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [cached, setCached] = useState(false)
  const [saved, setSaved] = useState(false)
  const eventId = useRef(crypto.randomUUID())
  const load = useCallback(async () => {
    try {
      const [b, p, o] = await Promise.all([api.breakdowns(), api.parts(), api.operations()])
      setRepairs(b.data); setParts(p.data); setTrucks(o.data.trucks)
      setCached(b.fromCache || p.fromCache || o.fromCache); setLoaded(true); setError(false)
    } catch { setError(true) }
  }, [])
  useEffect(() => { void load() }, [load])
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true); setError(false); setSaved(false)
    try { await action(); await load(); onChange(); setSaved(true) } catch { setError(true) } finally { setBusy(false) }
  }
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    void mutate(async () => {
      await api.createBreakdown({ event_id: eventId.current, truck_id: String(f.get('truck')), part_id: String(f.get('part')),
        symptom: String(f.get('symptom')).trim(), cause_category: String(f.get('cause')) as BreakdownIn['cause_category'],
        opened_at: new Date(String(f.get('opened'))).toISOString() })
      eventId.current = crypto.randomUUID(); form.reset()
    })
  }
  return <section className="card space-y-4" aria-labelledby="repairs-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="repairs-title" className="text-2xl font-bold text-navy">{t.repairs}</h2><button className={buttonClass} disabled={busy} onClick={() => void load()}>{t.refresh}</button></div>
    {error && <ErrorNotice />}{saved && <p role="status">{t.saved}</p>}{cached && <p>{t.cached}</p>}
    {!loaded ? <p role="status">{t.loading}</p> : <>
      {!staff && <p>{t.staff}</p>}
      <details><summary className="tap cursor-pointer py-3 font-bold text-navy">{t.incident}</summary>
        <form onSubmit={create}><fieldset disabled={!staff || busy || cached} className="grid gap-3 sm:grid-cols-2">
          <Field label={t.truck}><select className={inputClass} name="truck">{trucks.map(v => <option key={v.id}>{v.id}</option>)}</select></Field>
          <Field label={t.part}><select className={inputClass} name="part">{parts.map(v => <option value={v.id} key={v.id}>{v.name} ({v.on_hand})</option>)}</select></Field>
          <Field label={t.symptom}><input className={inputClass} name="symptom" required maxLength={1000} /></Field>
          <Field label={`${t.cause} · ${t.unconfirmed}`}><select className={inputClass} name="cause">{(['unknown', 'wear', 'freeze', 'electrical', 'other'] as const).map(v => <option value={v} key={v}>{t[v]}</option>)}</select></Field>
          <Field label={t.opened}><input className={inputClass} type="datetime-local" name="opened" required defaultValue={localTime()} /></Field>
          <button className={buttonClass} type="submit">{busy ? t.saving : t.save}</button>
        </fieldset></form>
      </details>
      {!repairs.length ? <p>{t.noRepairs}</p> : <ul className="divide-y divide-slate-200">{repairs.map(b => <li key={b.event_id} className="space-y-2 py-4">
        <h3 className="text-lg font-bold text-navy">{b.truck_id} · {parts.find(p => p.id === b.part_id)?.name} · {b.status === 'fixed' ? t.fixedStatus : t[b.status]}</h3>
        <p>{b.symptom}</p><p>{t.cause}: {t[b.cause_category]} · {b.cause_confirmed ? t.confirmed : t.unconfirmed}</p>
        <p>{t.opened}: {new Date(b.opened_at).toLocaleString()} · {t.stock}: {b.stock_quantity}</p>
        {b.fixed_at ? <p className="font-semibold">{t.fixed}: {new Date(b.fixed_at).toLocaleString()} · {t.repairTime}: {(b.restoration_seconds! / 3600).toFixed(1)} {t.hours}</p> : <>
          {b.status === 'open' && <button className={buttonClass} disabled={!staff || busy || cached} onClick={() => void mutate(() => api.repair(b.event_id, { status: 'repairing' }))}>{t.startRepair}</button>}
          <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void mutate(() => api.repair(b.event_id, { status: 'fixed', fixed_at: new Date(String(f.get('fixed'))).toISOString(), parts_used: Number(f.get('used')) })) }}>
            <fieldset disabled={!staff || busy || cached} className="grid items-end gap-3 sm:grid-cols-3">
              <Field label={t.partsUsed}><input className={inputClass} type="number" name="used" min={0} max={b.stock_quantity} step={1} required defaultValue={0} /></Field>
              <Field label={t.fixed}><input className={inputClass} type="datetime-local" name="fixed" required defaultValue={localTime()} /></Field>
              <button className={buttonClass} type="submit">{t.finishRepair}</button>
            </fieldset>
          </form>
        </>}
      </li>)}</ul>}
      <details><summary className="tap cursor-pointer py-3 font-bold text-navy">{t.updateStock}</summary>
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void mutate(() => api.updateStock(String(f.get('part')), Number(f.get('quantity')))) }}>
          <fieldset className="grid gap-3 sm:grid-cols-3" disabled={!staff || busy || cached}>
            <Field label={t.part}><select className={inputClass} name="part">{parts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.on_hand})</option>)}</select></Field>
            <Field label={t.stock}><input className={inputClass} name="quantity" type="number" required min={0} step={1} /></Field>
            <button className={buttonClass} type="submit">{t.save}</button>
          </fieldset>
        </form>
      </details>
    </>}
  </section>
}
