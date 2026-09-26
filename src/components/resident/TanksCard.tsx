import { CalendarClock, Calculator, ChevronRight, Radio, Siren, TriangleAlert } from 'lucide-react'
import type { Forecast, Measurement, SewageStatus } from '../../api/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { TankIllustration } from './TankIllustration'

function minutesSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
}

/** Clean water and wastewater tanks side by side. */
export function TanksCard({
  forecast,
  sewage,
  measurement,
  onOpenSensor,
}: {
  forecast: Forecast
  sewage: SewageStatus
  measurement: Measurement
  onOpenSensor: () => void
}) {
  const t = useT()
  const fmt = useFormat()
  const low = forecast.days_left < 2
  const sensor = measurement.source === 'sensor'

  return (
    <section aria-labelledby="tanks-heading" className="card">
      <h2 id="tanks-heading" className="text-lg font-semibold text-slate-600 uppercase tracking-wide">
        {t.water.title}
      </h2>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {/* ---- Clean water ---- */}
        <div className="rounded-2xl border-2 border-slate-100 p-4">
          <h3 className="text-xl font-bold text-navy">{t.tanks.clean}</h3>
          <div className="mt-2 flex items-center gap-4">
            <div className="w-24 shrink-0">
              <TankIllustration percent={forecast.percent} label={t.water.tankLabel(forecast.percent, fmt.number(forecast.litres_left))} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-tight text-navy" aria-live="polite">
                {t.water.daysLeft(forecast.days_left)}
              </p>
              <p className="mt-1 text-slate-700">{t.water.litresLeft(fmt.number(forecast.litres_left))}</p>
              <p className="text-slate-700">{t.water.tank(fmt.number(forecast.capacity_l))}</p>
              {low && (
                <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-status-boil bg-amber-50 px-3 py-0.5 font-semibold text-status-boil">
                  <TriangleAlert aria-hidden="true" className="h-5 w-5" />
                  {t.water.runningLow}
                </p>
              )}
            </div>
          </div>
          {/* How we know */}
          <p
            className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${
              sensor ? 'bg-teal/10 text-teal-dark' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {sensor ? <Radio aria-hidden="true" className="h-5 w-5" /> : <Calculator aria-hidden="true" className="h-5 w-5" />}
            {sensor ? t.tanks.sensorBadge(t.tanks.minutesAgo(minutesSince(measurement.updated_at))) : t.tanks.estimatedBadge}
          </p>
          {!sensor && <p className="mt-2 text-slate-600">{t.tanks.estimatedNote}</p>}
          {sensor && (
            <button
              type="button"
              onClick={onOpenSensor}
              className="tap mt-2 inline-flex items-center gap-1 rounded-lg px-2 font-semibold text-glacier underline-offset-4 hover:underline"
            >
              {t.tanks.viewSensor}
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* ---- Wastewater ---- */}
        <div className={`rounded-2xl border-2 p-4 ${sewage.is_full ? 'border-status-nodrink bg-red-50' : 'border-slate-100'}`}>
          <h3 className="text-xl font-bold text-navy">{t.tanks.waste}</h3>
          {sewage.is_full ? (
            <div role="alert" className="mt-2">
              <p className="flex items-center gap-2 text-2xl font-bold text-status-nodrink">
                <Siren aria-hidden="true" className="h-8 w-8 shrink-0" />
                {t.tanks.pickupNeeded}
              </p>
              <p className="mt-2 text-ink">{t.tanks.pickupDetail}</p>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-4">
              <div className="w-24 shrink-0">
                <TankIllustration percent={sewage.percent} label={t.tanks.wasteLabel(sewage.percent)} variant="waste" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-tight text-navy">{t.tanks.daysUntilFull(sewage.days_until_full)}</p>
                <p className="mt-1 text-slate-700">{t.tanks.wasteUsed(fmt.number(sewage.litres), fmt.number(sewage.capacity_l))}</p>
                {sewage.days_until_full < 1.5 && (
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-status-boil bg-amber-50 px-3 py-0.5 font-semibold text-status-boil">
                    <TriangleAlert aria-hidden="true" className="h-5 w-5" />
                    {t.water.runningLow}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-4 text-slate-600">
        <CalendarClock aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
        <span>
          <span className="block">{t.water.emptyBy(`${fmt.day(forecast.predicted_empty)}, ${fmt.time(forecast.predicted_empty)}`)}</span>
          {!sewage.is_full && (
            <span className="block">{t.tanks.fullBy(`${fmt.day(sewage.predicted_full)}, ${fmt.time(sewage.predicted_full)}`)}</span>
          )}
          <span className="block text-slate-500">{t.water.confidence[forecast.confidence]}</span>
        </span>
      </p>
    </section>
  )
}
