import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  CircleCheckBig,
  CloudUpload,
  Droplet,
  GlassWater,
  Info,
  LoaderCircle,
  MessageSquareText,
  Pencil,
  Send,
  Siren,
  Thermometer,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { api } from '../../api/client'
import type { Classification, ReportType } from '../../api/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'

const ICONS: Record<ReportType, typeof Droplet> = {
  clean_water_low: Droplet,
  sewage_full: Siren,
  other: MessageSquareText,
  water_quality: GlassWater,
  tank_damage: Wrench,
  illness: Thermometer,
}
const QUICK: ReportType[] = ['clean_water_low', 'sewage_full', 'other']
const ALL: ReportType[] = ['clean_water_low', 'sewage_full', 'water_quality', 'tank_damage', 'illness', 'other']

type Step =
  | { kind: 'choose' }
  | { kind: 'guess'; text: string; result: Classification }
  | { kind: 'pick'; text: string; unsure: boolean }
  | { kind: 'confirm'; type: ReportType; text?: string; classifier?: ReportType }
  | { kind: 'done'; type: ReportType; queued: boolean; at: string }

/** Report a problem: quick buttons, or free text classified by the server — saved only after the resident confirms. */
export function ReportProblem({ householdId }: { householdId: string }) {
  const t = useT()
  const r = t.report
  const fmt = useFormat()
  const [step, setStep] = useState<Step>({ kind: 'choose' })
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)

  // Move focus to the new screen's heading so keyboard/screen-reader users follow along.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    headingRef.current?.focus()
  }, [step.kind])

  async function classifyText(e: FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    setBusy(true)
    try {
      const result = await api.classify(value)
      setStep(result.category === 'other' && result.matched.length === 0 ? { kind: 'pick', text: value, unsure: true } : { kind: 'guess', text: value, result })
    } catch {
      // Offline: the resident picks the type themselves.
      setStep({ kind: 'pick', text: value, unsure: true })
    } finally {
      setBusy(false)
    }
  }

  async function send(type: ReportType, note?: string, classifier?: ReportType) {
    setBusy(true)
    setError(false)
    try {
      const res = await api.report({ type, household_id: householdId, note, classifier_category: classifier })
      setStep({ kind: 'done', type, queued: res.queued, at: res.queued ? new Date().toISOString() : res.data.timestamp })
      setText('')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const advice: Record<ReportType, string> = {
    clean_water_low: r.adviceLow,
    sewage_full: r.adviceSewage,
    water_quality: r.adviceWater,
    tank_damage: r.adviceTank,
    illness: r.adviceIllness,
    other: r.adviceOther,
  }

  const heading = (label: string) => (
    <h2 id="report-heading" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-navy">
      {label}
    </h2>
  )

  const typeButton = (type: ReportType, onClick: () => void, highlight = false) => {
    const Icon = ICONS[type]
    return (
      <button
        key={type}
        type="button"
        onClick={onClick}
        className={`min-h-[4rem] flex items-center gap-4 rounded-xl border-2 bg-white px-4 py-3 text-left font-semibold text-navy hover:border-glacier hover:bg-slate-50 ${
          highlight ? 'border-teal' : 'border-slate-200'
        }`}
      >
        <span className={`shrink-0 rounded-full p-2 ${type === 'sewage_full' ? 'bg-red-50 text-status-nodrink' : 'bg-glacier/10 text-glacier'}`}>
          <Icon aria-hidden="true" className="h-6 w-6" />
        </span>
        {r[type]}
      </button>
    )
  }

  return (
    <section aria-labelledby="report-heading" className="card">
      {step.kind === 'choose' && (
        <>
          {heading(r.title)}
          <p className="mt-1 text-slate-600">{r.help}</p>
          <div className="mt-4 grid gap-3">
            {QUICK.map((type) =>
              typeButton(type, () =>
                type === 'other' ? document.getElementById('report-text')?.focus() : setStep({ kind: 'confirm', type }),
              ),
            )}
          </div>
          <form onSubmit={classifyText} className="mt-5">
            <label htmlFor="report-text" className="font-semibold text-navy">
              {r.describe}
            </label>
            <p id="report-hint" className="text-slate-600">
              {r.describeHint}
            </p>
            <textarea
              id="report-text"
              aria-describedby="report-hint"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="mt-2 block w-full rounded-xl border-2 border-slate-300 p-3 focus:border-glacier"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="tap mt-3 inline-flex items-center gap-2 rounded-xl bg-glacier px-5 font-bold text-white hover:bg-navy disabled:opacity-50"
            >
              {busy ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Send aria-hidden="true" className="h-5 w-5" />}
              {busy ? r.checking : r.check}
            </button>
          </form>
        </>
      )}

      {step.kind === 'guess' && (
        <>
          {heading(r.weThink(r[step.result.category]))}
          <blockquote className="mt-3 rounded-xl border-l-4 border-glacier bg-bg p-3 italic text-ink">“{step.text}”</blockquote>
          {step.result.matched.length > 0 && (
            <p className="mt-2 text-slate-600">{r.because(step.result.matched.map((m) => `“${m}”`).join(', '))}</p>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep({ kind: 'confirm', type: step.result.category, text: step.text, classifier: step.result.category })}
              className="tap flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-glacier px-5 font-bold text-white hover:bg-navy"
            >
              <CircleCheckBig aria-hidden="true" className="h-5 w-5" />
              {r.yes}
            </button>
            <button
              type="button"
              onClick={() => setStep({ kind: 'pick', text: step.text, unsure: false })}
              className="tap inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 px-5 font-semibold text-navy hover:bg-slate-50"
            >
              <Pencil aria-hidden="true" className="h-5 w-5" />
              {r.change}
            </button>
          </div>
        </>
      )}

      {step.kind === 'pick' && (
        <>
          {heading(step.unsure ? r.unsure : r.choose)}
          <div className="mt-4 grid gap-3">
            {ALL.map((type) => typeButton(type, () => setStep({ kind: 'confirm', type, text: step.text })))}
          </div>
          <button type="button" onClick={() => setStep({ kind: 'choose' })} className="tap mt-3 inline-flex items-center gap-2 rounded-xl px-3 font-semibold text-slate-700 hover:bg-slate-50">
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
            {r.cancel}
          </button>
        </>
      )}

      {step.kind === 'confirm' && (
        <>
          {heading(r.confirmTitle)}
          <div className="mt-4 rounded-xl border border-slate-200 bg-bg p-4">
            <p className="font-semibold text-navy">{r[step.type]}</p>
            {step.text && (
              <p className="mt-1 text-ink">
                <span className="font-semibold">{r.yourWords}:</span> “{step.text}”
              </p>
            )}
            <p className="text-slate-600">{r.confirmFor(householdId)}</p>
          </div>
          {error && (
            <p className="mt-3 inline-flex items-center gap-2 font-semibold text-status-nodrink" role="alert">
              <TriangleAlert aria-hidden="true" className="h-5 w-5" />
              {r.error}
            </p>
          )}
          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep({ kind: 'choose' })}
              className="tap inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 px-5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              {r.cancel}
            </button>
            <button
              type="button"
              onClick={() => send(step.type, step.text, step.classifier)}
              disabled={busy}
              className="tap flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-glacier px-5 py-3 font-bold text-white hover:bg-navy disabled:opacity-70"
            >
              <Send aria-hidden="true" className="h-5 w-5" />
              {r.send}
            </button>
          </div>
        </>
      )}

      {step.kind === 'done' && (
        <div role="status">
          <div className="flex items-start gap-3">
            {step.queued ? (
              <CloudUpload aria-hidden="true" className="h-8 w-8 shrink-0 text-glacier" />
            ) : (
              <CircleCheckBig aria-hidden="true" className="h-8 w-8 shrink-0 text-status-safe" />
            )}
            <div>
              {heading(step.queued ? r.queuedTitle : r.sentTitle)}
              <p className="mt-1 text-slate-700">{step.queued ? r.queuedAt : r.sentAt(fmt.time(step.at))}</p>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-bg p-4">
            <Info aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-glacier" />
            {advice[step.type]}
          </p>
          <button
            type="button"
            onClick={() => setStep({ kind: 'choose' })}
            className="tap mt-4 w-full rounded-xl border-2 border-slate-300 px-6 font-semibold text-navy hover:bg-slate-50 sm:w-auto"
          >
            {r.done}
          </button>
        </div>
      )}
    </section>
  )
}
