import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CircleCheck, Droplets, FlaskConical, LoaderCircle, Scale, TriangleAlert } from 'lucide-react'
import { api } from '../../api/client'
import type { SensorPoint, SensorReading } from '../../api/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'

const POLL_MS = 3000

function Sparkline({ points, label }: { points: SensorPoint[]; label: string }) {
  if (points.length < 2) return null
  const W = 600
  const H = 140
  const values = points.map((p) => p.litres)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1)
  const t0 = new Date(points[0].at).getTime()
  const t1 = new Date(points[points.length - 1].at).getTime()
  const x = (p: SensorPoint) => ((new Date(p.at).getTime() - t0) / Math.max(t1 - t0, 1)) * W
  const y = (v: number) => H - 8 - ((v - min) / span) * (H - 16)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(p.litres).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-36 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E9AA7" stopOpacity="0.35" />
          <stop offset="1" stopColor="#0E9AA7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="#0B7285" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

/** What the tank sensor hardware would show (simulated). */
export function SensorPage({ householdId, onBack }: { householdId: string; onBack: () => void }) {
  const t = useT()
  const s = t.sensor
  const fmt = useFormat()
  const [reading, setReading] = useState<SensorReading | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setReading((await api.sensor(householdId)).data)
      setError(false)
    } catch {
      setError(true)
    }
  }, [householdId])

  useEffect(() => {
    void load()
    const id = window.setInterval(load, POLL_MS)
    return () => window.clearInterval(id)
  }, [load])

  async function simulate() {
    setBusy(true)
    try {
      setReading(await api.simulateUsage(householdId))
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const values = reading?.series_24h.map((p) => p.litres) ?? []

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={onBack} className="tap inline-flex items-center gap-2 self-start rounded-xl px-3 font-semibold text-glacier hover:bg-white">
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        {s.back}
      </button>

      <section aria-labelledby="sensor-heading" className="card">
        <h2 id="sensor-heading" className="text-2xl font-bold text-navy" tabIndex={-1}>
          {s.title} · {householdId}
        </h2>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-status-boil bg-amber-50 px-3 py-1 font-semibold text-status-boil">
          <FlaskConical aria-hidden="true" className="h-5 w-5" />
          {s.label}
        </p>

        {!reading ? (
          <p className="mt-6 flex items-center gap-2" role="status">
            {error ? <TriangleAlert aria-hidden="true" className="h-5 w-5 text-status-nodrink" /> : <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-teal" />}
            {error ? t.loadError : t.loading}
          </p>
        ) : (
          <>
            {/* Device-style readout */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-navy p-5 text-white">
                <p className="flex items-center gap-2 font-semibold text-sky-200">
                  <Scale aria-hidden="true" className="h-5 w-5" />
                  {s.liveWeight}
                </p>
                <p className="mt-1 font-mono text-5xl font-bold tabular-nums">
                  {reading.raw_weight_kg.toFixed(1)}
                  <span className="ml-2 text-2xl">kg</span>
                </p>
                <p className="mt-2 text-sky-100">{s.smoothed(reading.smoothed_weight_kg.toFixed(1))}</p>
                <p className="text-sky-100">{s.empty(reading.empty_tank_kg.toFixed(0))}</p>
              </div>
              <div className="rounded-2xl border-2 border-teal bg-teal/10 p-5">
                <p className="flex items-center gap-2 font-semibold text-teal-dark">
                  <Droplets aria-hidden="true" className="h-5 w-5" />
                  {s.litres}
                </p>
                <p className="mt-1 text-5xl font-bold tabular-nums text-navy" aria-live="polite">
                  {fmt.number(reading.litres)}
                  <span className="ml-2 text-2xl">L</span>
                </p>
                <p className="mt-2 font-mono text-slate-700">
                  {s.formula(reading.smoothed_weight_kg.toFixed(0), reading.empty_tank_kg.toFixed(0), fmt.number(reading.litres))}
                </p>
                <p className="text-slate-600">{s.updated(fmt.time(reading.updated_at))}</p>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="font-semibold text-navy">{s.chartTitle}</h3>
              <div className="mt-2 rounded-xl border border-slate-200 p-2">
                <Sparkline
                  points={reading.series_24h}
                  label={s.chartLabel(fmt.number(Math.round(Math.min(...values))), fmt.number(Math.round(Math.max(...values))))}
                />
              </div>
            </div>

            {reading.leak ? (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border-2 border-status-nodrink bg-red-50 p-3 font-semibold text-status-nodrink">
                <TriangleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  {s.leak}: {reading.leak.note}
                </span>
              </p>
            ) : (
              <p className="mt-4 flex items-center gap-2 font-semibold text-status-safe">
                <CircleCheck aria-hidden="true" className="h-5 w-5" />
                {s.noLeak}
              </p>
            )}

            <button
              type="button"
              onClick={simulate}
              disabled={busy}
              className="tap mt-5 inline-flex items-center gap-2 rounded-full bg-teal-dark px-6 font-bold text-white hover:bg-navy disabled:opacity-60"
            >
              <Droplets aria-hidden="true" className="h-5 w-5" />
              {s.simulate}
            </button>
          </>
        )}
      </section>

      <section aria-labelledby="sensor-how" className="card">
        <h2 id="sensor-how" className="text-xl font-bold text-navy">
          {s.howTitle}
        </h2>
        <p className="mt-2 text-ink">{s.how}</p>
      </section>
    </div>
  )
}
