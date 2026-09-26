import { CircleCheck, Clock, Siren } from 'lucide-react'
import type { Urgency } from '../../api/types'
import { useT } from '../../i18n'

// Colour is always paired with an icon + text.
const STYLES: Record<Urgency, { Icon: typeof Siren; cls: string }> = {
  urgent: { Icon: Siren, cls: 'bg-status-nodrink text-white' },
  soon: { Icon: Clock, cls: 'bg-amber-50 text-status-boil border-2 border-status-boil' },
  ok: { Icon: CircleCheck, cls: 'bg-green-50 text-status-safe border-2 border-status-safe' },
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const t = useT()
  const { Icon, cls } = STYLES[urgency]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold whitespace-nowrap ${cls}`}>
      <Icon aria-hidden="true" className="h-5 w-5" />
      {t.driver.urgency[urgency]}
    </span>
  )
}
