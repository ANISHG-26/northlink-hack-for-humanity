import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CircleCheckBig, CloudUpload, GlassWater, Info, Send, Thermometer, TriangleAlert, Wrench } from 'lucide-react'
import { api } from '../../api/client'
import type { ReportType } from '../../api/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'

const TYPES: { id: ReportType; Icon: typeof GlassWater }[] = [
  { id: 'water_quality', Icon: GlassWater },
  { id: 'tank_damage', Icon: Wrench },
  { id: 'illness', Icon: Thermometer },
]

type Step = { kind: 'choose' } | { kind: 'confirm'; type: ReportType } | { kind: 'done'; type: ReportType; queued: boolean; at: string }

export function ReportProblem({ householdId }: { householdId: string }) {
  const t = useT()
  const fmt = useFormat()
  const [step, setStep] = useState<Step>({ kind: 'choose' })
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

  async function send(type: ReportType) {
    setBusy(true)
    setError(false)
    try {
      const res = await api.report({ type, household_id: householdId })
      setStep({ kind: 'done', type, queued: res.queued, at: res.queued ? new Date().toISOString() : res.data.timestamp })
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const advice = { water_quality: t.report.adviceWater, tank_damage: t.report.adviceTank, illness: t.report.adviceIllness }

  return (
    <section aria-labelledby="report-heading" className="card">
      {step.kind === 'choose' && (
        <>
          <h2 id="report-heading" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-navy">
            {t.report.title}
          </h2>
          <p className="mt-1 text-slate-600">{t.report.help}</p>
          <div className="mt-4 grid gap-3">
            {TYPES.map(({ id, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setStep({ kind: 'confirm', type: id })}
                className="min-h-[4rem] flex items-center gap-4 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left font-semibold text-navy hover:border-glacier hover:bg-slate-50"
              >
                <span className="shrink-0 rounded-full bg-glacier/10 p-2 text-glacier">
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </span>
                {t.report[id]}
              </button>
            ))}
          </div>
        </>
      )}

      {step.kind === 'confirm' && (
        <>
          <h2 id="report-heading" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-navy">
            {t.report.confirmTitle}
          </h2>
          <div className="mt-4 rounded-xl bg-bg border border-slate-200 p-4">
            <p className="font-semibold text-navy">{t.report[step.type]}</p>
            <p className="text-slate-600">{t.report.confirmFor(householdId)}</p>
          </div>
          {error && (
            <p className="mt-3 inline-flex items-center gap-2 text-status-nodrink font-semibold" role="alert">
              <TriangleAlert aria-hidden="true" className="h-5 w-5" />
              {t.report.error}
            </p>
          )}
          <div className="mt-4 flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setStep({ kind: 'choose' })}
              className="tap inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 px-5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              {t.report.cancel}
            </button>
            <button
              type="button"
              onClick={() => send(step.type)}
              disabled={busy}
              className="tap flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-glacier px-5 py-3 font-bold text-white hover:bg-navy disabled:opacity-70"
            >
              <Send aria-hidden="true" className="h-5 w-5" />
              {t.report.send}
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
              <h2 id="report-heading" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-navy">
                {step.queued ? t.report.queuedTitle : t.report.sentTitle}
              </h2>
              <p className="mt-1 text-slate-700">{step.queued ? t.report.queuedAt : t.report.sentAt(fmt.time(step.at))}</p>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-bg border border-slate-200 p-4">
            <Info aria-hidden="true" className="h-5 w-5 mt-1 shrink-0 text-glacier" />
            {advice[step.type]}
          </p>
          <button
            type="button"
            onClick={() => setStep({ kind: 'choose' })}
            className="tap mt-4 w-full sm:w-auto rounded-xl border-2 border-slate-300 px-6 font-semibold text-navy hover:bg-slate-50"
          >
            {t.report.done}
          </button>
        </div>
      )}
    </section>
  )
}
