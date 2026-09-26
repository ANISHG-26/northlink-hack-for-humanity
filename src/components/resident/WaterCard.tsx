import { CalendarClock, TriangleAlert } from 'lucide-react'
import type { Forecast } from '../../api/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { TankIllustration } from './TankIllustration'

export function WaterCard({ forecast }: { forecast: Forecast }) {
  const t = useT()
  const fmt = useFormat()
  const low = forecast.days_left < 2

  return (
    <section aria-labelledby="water-heading" className="card">
      <h2 id="water-heading" className="text-lg font-semibold text-slate-600 uppercase tracking-wide">
        {t.water.title}
      </h2>
      <div className="mt-3 flex items-center gap-5 sm:gap-8">
        <div className="w-28 sm:w-36 shrink-0">
          <TankIllustration
            percent={forecast.percent}
            label={t.water.tankLabel(forecast.percent, fmt.number(forecast.litres_left))}
          />
        </div>
        <div className="min-w-0">
          <p className="text-3xl sm:text-4xl font-bold text-navy leading-tight" aria-live="polite">
            {t.water.daysLeft(forecast.days_left)}
          </p>
          <p className="mt-2 text-lg text-slate-700">{t.water.litresLeft(fmt.number(forecast.litres_left))}</p>
          <p className="text-lg text-slate-700">{t.water.tank(fmt.number(forecast.capacity_l))}</p>
          {low && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-status-boil text-status-boil px-3 py-1 font-semibold">
              <TriangleAlert aria-hidden="true" className="h-5 w-5" />
              {t.water.runningLow}
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2 text-slate-600">
        <CalendarClock aria-hidden="true" className="h-5 w-5 mt-1 shrink-0" />
        <span>
          <span className="block">
            {t.water.emptyBy(`${fmt.day(forecast.predicted_empty)}, ${fmt.time(forecast.predicted_empty)}`)}
          </span>
          <span className="block text-slate-500">{t.water.confidence[forecast.confidence]}</span>
        </span>
      </p>
    </section>
  )
}
