import { useState } from 'react'
import { CalendarClock, Check, CircleCheckBig, Clock, MapPin, PackageCheck, SkipForward, Truck } from 'lucide-react'
import { DELIVERY_STAGES, type Delivery } from '../../api/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'

const STAGE_ICONS = {
  scheduled: CalendarClock,
  truck_loaded: PackageCheck,
  en_route: Truck,
  nearby: MapPin,
  delivered: CircleCheckBig,
}

/** Package-style delivery tracker. */
export function DeliveryTracker({ delivery, onAdvance }: { delivery: Delivery; onAdvance: () => Promise<void> }) {
  const t = useT()
  const fmt = useFormat()
  const [busy, setBusy] = useState(false)
  const current = delivery.stage_index
  const total = DELIVERY_STAGES.length

  const minsAway = Math.max(1, Math.round((new Date(delivery.eta).getTime() - Date.now()) / 60_000))
  const etaText =
    delivery.stage === 'delivered'
      ? t.delivery.delivered(fmt.time(delivery.eta))
      : delivery.stage === 'en_route' || delivery.stage === 'nearby'
        ? t.delivery.arrivingSoon(minsAway)
        : t.delivery.arriving(fmt.day(delivery.eta), fmt.time(delivery.eta))

  async function advance() {
    setBusy(true)
    try {
      await onAdvance()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="delivery-heading" className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="delivery-heading" className="text-lg font-semibold text-slate-600 uppercase tracking-wide">
          {t.delivery.title}
        </h2>
        <p className="inline-flex items-center gap-2 font-semibold text-navy">
          <Truck aria-hidden="true" className="h-5 w-5 text-glacier" />
          {t.delivery.truck(delivery.truck_name)}
        </p>
      </div>

      <p className="mt-2 text-2xl sm:text-3xl font-bold text-navy" aria-live="polite">
        {etaText}
      </p>

      {/* Stepper: vertical on phones, horizontal on wider screens */}
      <ol className="mt-5 flex flex-col sm:flex-row gap-0" aria-label={t.delivery.step(current + 1, total)}>
        {DELIVERY_STAGES.map((stage, i) => {
          const Icon = STAGE_ICONS[stage]
          const done = i < current || (i === current && stage === 'delivered')
          const active = i === current
          const reached = i <= current
          return (
            <li
              key={stage}
              aria-current={active ? 'step' : undefined}
              className="relative flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 sm:flex-1 pb-4 sm:pb-0 last:pb-0"
            >
              {/* connector */}
              {i < total - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-6 top-12 bottom-0 w-1 -translate-x-1/2 sm:left-1/2 sm:top-6 sm:bottom-auto sm:h-1 sm:w-full sm:translate-x-0 sm:-translate-y-1/2 rounded ${
                    i < current ? 'bg-teal' : 'bg-slate-200'
                  }`}
                />
              )}
              <span
                className={`relative z-[1] flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 transition-colors ${
                  active
                    ? 'bg-teal border-teal text-white ring-4 ring-teal/25'
                    : reached
                      ? 'bg-teal border-teal text-white'
                      : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                {done && !active ? <Check aria-hidden="true" className="h-6 w-6" strokeWidth={3} /> : <Icon aria-hidden="true" className="h-6 w-6" />}
              </span>
              <span
                className={`sm:text-center leading-tight ${active ? 'font-bold text-navy' : reached ? 'text-ink' : 'text-slate-500'}`}
              >
                {t.delivery.stages[stage]}
                {(active || done) && (
                  <span className="sr-only"> ({active ? t.delivery.current : t.delivery.done})</span>
                )}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-slate-600">
          <Clock aria-hidden="true" className="h-5 w-5" />
          {t.delivery.lastUpdated(fmt.time(delivery.updated_at))}
        </p>
        <button
          type="button"
          onClick={advance}
          disabled={busy}
          className="tap inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <SkipForward aria-hidden="true" className="h-5 w-5" />
          {t.delivery.nextStage}
        </button>
      </div>
    </section>
  )
}
