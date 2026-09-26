import type { Safety } from '../../api/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { STATUS_STYLES } from '../StatusBadge'

/** Water safety for the household's zone — icon + text + date, never colour alone. */
export function SafetyBanner({ safety }: { safety: Safety }) {
  const t = useT()
  const fmt = useFormat()
  const { Icon, solid } = STATUS_STYLES[safety.status]
  const detail = { safe: t.safety.safeDetail, boil: t.safety.boilDetail, nodrink: t.safety.nodrinkDetail }[safety.status]

  return (
    <section
      aria-labelledby="safety-heading"
      className={`${solid} text-white rounded-2xl p-5 shadow-sm flex gap-4 items-start`}
    >
      <span className="shrink-0 rounded-full bg-white/20 p-3">
        <Icon aria-hidden="true" className="h-8 w-8" strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <h2 id="safety-heading" className="text-2xl font-bold leading-tight">
          {t.safety[safety.status]}
        </h2>
        <p className="mt-1 font-semibold text-white/95">
          {t.safety.zone(safety.zone)}
          {safety.since && <> · {t.safety.since(fmt.date(safety.since))}</>}
        </p>
        <p className="mt-2 text-white">{detail}</p>
        {safety.message && (
          <p className="mt-3 rounded-xl bg-white/15 p-3 text-white">
            <span className="block font-semibold">{t.dispatcher.dialog.messageFrom}</span>
            {safety.message}
          </p>
        )}
      </div>
    </section>
  )
}
