import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Flame, LoaderCircle, Megaphone, OctagonX, TriangleAlert, X } from 'lucide-react'
import { api } from '../../api/client'
import type { AdvisorySource, Zone } from '../../api/types'
import { useT } from '../../i18n'
import { AdvisoryNotice } from '../resident/AdvisoryNotice'

const ZONES: Zone[] = ['A', 'B', 'C', 'D', 'E', 'F']
const SOURCES: AdvisorySource[] = ['Municipal water office', 'Regional health board']
type Level = 'boil' | 'do_not_drink'

/** Modal to issue a water advisory, with a live preview of the resident banner. */
export function AdvisoryDialog({
  zone: initialZone,
  onClose,
  onIssued,
}: {
  zone: Zone
  onClose: () => void
  onIssued: (zone: Zone) => void
}) {
  const t = useT()
  const d = t.dispatcher.dialog
  const ref = useRef<HTMLDialogElement>(null)
  const [zone, setZone] = useState<Zone>(initialZone)
  const [level, setLevel] = useState<Level>('boil')
  const [message, setMessage] = useState(d.defaultBoil)
  const [touched, setTouched] = useState(false)
  const [source, setSource] = useState<AdvisorySource>('Municipal water office')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const dlg = ref.current
    dlg?.showModal()
    return () => dlg?.close()
  }, [])

  // Keep the default text in step with the level until the dispatcher edits it.
  useEffect(() => {
    if (!touched) setMessage(level === 'boil' ? d.defaultBoil : d.defaultNodrink)
  }, [level, touched, d.defaultBoil, d.defaultNodrink])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(false)
    try {
      await api.issueAdvisory({ zone, level, message, source })
      onIssued(zone)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const levels: { id: Level; label: string; Icon: typeof Flame; cls: string }[] = [
    { id: 'boil', label: d.boil, Icon: Flame, cls: 'peer-checked:border-status-boil peer-checked:bg-amber-50' },
    { id: 'do_not_drink', label: d.nodrink, Icon: OctagonX, cls: 'peer-checked:border-status-nodrink peer-checked:bg-red-50' },
  ]

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      aria-labelledby="advisory-title"
      className="w-[min(40rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-2xl p-0 shadow-2xl backdrop:bg-navy/60"
    >
      <form onSubmit={submit} className="flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 id="advisory-title" className="text-xl font-bold text-navy flex items-center gap-2">
            <Megaphone aria-hidden="true" className="h-6 w-6 text-status-boil" />
            {d.title}
          </h2>
          <button type="button" onClick={onClose} className="tap inline-flex items-center justify-center rounded-lg hover:bg-slate-100">
            <X aria-hidden="true" className="h-6 w-6" />
            <span className="sr-only">{d.cancel}</span>
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-4 overflow-y-auto">
          <div>
            <label htmlFor="adv-zone" className="font-semibold text-navy">
              {d.zone}
            </label>
            <select
              id="adv-zone"
              value={zone}
              onChange={(e) => setZone(e.target.value as Zone)}
              className="tap mt-1 block w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-lg"
            >
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {t.dispatcher.zoneLabel(z)}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="font-semibold text-navy">{d.level}</legend>
            <div className="mt-1 grid grid-cols-2 gap-3">
              {levels.map(({ id, label, Icon, cls }) => (
                <label key={id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="level"
                    value={id}
                    checked={level === id}
                    onChange={() => setLevel(id)}
                    className="peer sr-only"
                  />
                  <span
                    className={`tap flex items-center gap-2 rounded-xl border-2 border-slate-300 px-3 py-2 font-semibold peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-glacier ${cls}`}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="adv-source" className="font-semibold text-navy">
              {d.source}
            </label>
            <select
              id="adv-source"
              value={source}
              onChange={(e) => setSource(e.target.value as AdvisorySource)}
              className="tap mt-1 block w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-lg"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {t.safety.sources[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="adv-message" className="font-semibold text-navy">
              {d.message}
            </label>
            <textarea
              id="adv-message"
              value={message}
              onChange={(e) => {
                setTouched(true)
                setMessage(e.target.value)
              }}
              rows={3}
              required
              className="mt-1 block w-full rounded-xl border-2 border-slate-300 p-3"
            />
          </div>

          <div>
            <p className="font-semibold text-navy mb-2">{d.preview}</p>
            <AdvisoryNotice
              safety={{
                status: level === 'boil' ? 'boil' : 'nodrink',
                zone,
                since: new Date().toLocaleDateString('en-CA'),
                reason: null,
                message,
                source,
                issued_at: new Date().toISOString(),
                last_checked: new Date().toISOString(),
              }}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 p-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-teal"
            />
            <span className="font-semibold text-navy">{d.confirmCheck(t.safety.sources[source])}</span>
          </label>

          {error && (
            <p role="alert" className="flex items-center gap-2 font-semibold text-status-nodrink">
              <TriangleAlert aria-hidden="true" className="h-5 w-5" />
              {d.error}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="tap rounded-xl border-2 border-slate-300 px-5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            {d.cancel}
          </button>
          <button
            type="submit"
            disabled={busy || !message.trim() || !confirmed}
            className="tap flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-status-boil px-5 py-3 font-bold text-white hover:bg-navy disabled:opacity-60"
          >
            {busy ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Megaphone aria-hidden="true" className="h-5 w-5" />}
            {d.confirm}
          </button>
        </div>
      </form>
    </dialog>
  )
}
