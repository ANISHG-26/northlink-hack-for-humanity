import { Clock, Landmark } from 'lucide-react'
import type { Safety } from '../../api/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { STATUS_STYLES } from '../StatusBadge'

/**
 * Official advisory for the household's zone — icon + text + date, never colour alone.
 * Northlink only relays advisories issued by staff for the named authority.
 */
export function SafetyBanner({ safety }: { safety: Safety }) {
  const t = useT()
  const fmt = useFormat()
  const { Icon } = STATUS_STYLES[safety.status]
  const none = safety.status === 'safe'
  const detail = { safe: t.safety.safeDetail, boil: t.safety.boilDetail, nodrink: t.safety.nodrinkDetail }[safety.status]
  // No advisory: calm neutral card. Active advisory: solid status colour.
  const tone = none
    ? 'bg-white text-ink border-2 border-slate-200'
    : safety.status === 'boil'
      ? 'bg-status-boil text-white'
      : 'bg-status-nodrink text-white'
  const sub = none ? 'text-slate-600' : 'text-white/95'

  return (
    <section aria-labelledby="safety-heading" className={`${tone} rounded-2xl p-5 shadow-sm`}>
      <div className="flex gap-4 items-start">
        <span className={`shrink-0 rounded-full p-3 ${none ? 'bg-green-50 text-status-safe' : 'bg-white/20'}`}>
          <Icon aria-hidden="true" className="h-8 w-8" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <h2 id="safety-heading" className="text-2xl font-bold leading-tight">
            {t.safety[safety.status]}
          </h2>
          <p className={`mt-1 font-semibold ${sub}`}>{t.safety.zone(safety.zone)}</p>
          <p className="mt-2">{detail}</p>
          {safety.message && (
            <p className={`mt-3 rounded-xl p-3 ${none ? 'bg-slate-50' : 'bg-white/15'}`}>
              <span className="block font-semibold">{t.dispatcher.dialog.messageFrom}</span>
              {safety.message}
            </p>
          )}
        </div>
      </div>
      <div className={`mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 ${none ? 'border-slate-100 text-slate-600' : 'border-white/25 text-white/95'}`}>
        {safety.source && safety.issued_at && (
          <p className="inline-flex items-center gap-2">
            <Landmark aria-hidden="true" className="h-5 w-5" />
            {t.safety.issuedBy(t.safety.sources[safety.source], fmt.date(safety.issued_at))}
          </p>
        )}
        <p className="inline-flex items-center gap-2">
          <Clock aria-hidden="true" className="h-5 w-5" />
          {t.safety.lastChecked(fmt.time(safety.last_checked))}
        </p>
        <p className="basis-full text-base">{t.safety.disclaimer}</p>
      </div>
    </section>
  )
}
