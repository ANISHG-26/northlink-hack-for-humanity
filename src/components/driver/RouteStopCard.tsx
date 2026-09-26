import { Baby, ChevronDown, Flame, HeartPulse, OctagonX, PackageX, UserRound } from 'lucide-react'
import type { RouteStop } from '../../api/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { UrgencyBadge } from './UrgencyBadge'

const VULNERABLE_ICONS = { elder: UserRound, infant: Baby, medical: HeartPulse }

export function RouteStopCard({ stop }: { stop: RouteStop }) {
  const t = useT()
  const fmt = useFormat()
  const VIcon = stop.vulnerable_type ? VULNERABLE_ICONS[stop.vulnerable_type] : null
  const AdvIcon = stop.advisory === 'nodrink' ? OctagonX : Flame

  return (
    <li className="card !p-0 overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        <span
          aria-hidden="true"
          className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-navy text-white text-xl font-bold"
        >
          {stop.rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-2xl font-bold text-navy tracking-wide">
              <span className="sr-only">#{stop.rank} </span>
              {stop.household_id}
            </p>
            <UrgencyBadge urgency={stop.urgency} />
          </div>
          <p className="text-slate-600">{t.safety.zone(stop.zone)}</p>
          <p className="mt-1 text-lg font-semibold text-ink">{t.driver.emptyIn(stop.hours_until_empty)}</p>
          {(VIcon || stop.advisory) && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {VIcon && stop.vulnerable_type && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-glacier/10 px-3 py-1 text-glacier font-semibold">
                  <VIcon aria-hidden="true" className="h-5 w-5" />
                  {t.driver.vulnerable[stop.vulnerable_type]}
                </li>
              )}
              {stop.advisory && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-status-boil font-semibold">
                  <AdvIcon aria-hidden="true" className="h-5 w-5" />
                  {t.driver.advisory[stop.advisory]}
                </li>
              )}
            </ul>
          )}
          {!stop.fits_in_load && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-slate-600">
              <PackageX aria-hidden="true" className="h-5 w-5" />
              {t.driver.overLoad}
            </p>
          )}
        </div>
      </div>
      <details className="group border-t border-slate-100">
        <summary className="tap flex cursor-pointer list-none items-center justify-between gap-2 px-4 font-semibold text-glacier hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          {t.driver.why}
          <ChevronDown aria-hidden="true" className="h-5 w-5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 text-slate-700">
          <ul className="list-disc pl-6 space-y-1">
            <li>{t.driver.emptyIn(stop.hours_until_empty)}</li>
            {stop.vulnerable_type && <li>{t.driver.vulnerable[stop.vulnerable_type]}</li>}
            {stop.advisory && <li>{t.driver.advisory[stop.advisory]}</li>}
            <li>{t.driver.litresLeft(fmt.number(stop.litres_left))}</li>
            <li>{t.driver.toFill(fmt.number(stop.litres_to_fill))}</li>
          </ul>
          <p className="mt-2 text-slate-500">{t.driver.rankNote(fmt.number(stop.priority_score))}</p>
        </div>
      </details>
    </li>
  )
}
