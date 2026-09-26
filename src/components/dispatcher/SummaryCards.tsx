import { Ban, CircleCheckBig, Flame, TriangleAlert } from 'lucide-react'
import type { Dashboard } from '../../api/types'
import { useT } from '../../i18n'

export function SummaryCards({ data }: { data: Dashboard }) {
  const t = useT()
  const cards = [
    { key: 'out', value: data.out_of_water, Icon: Ban, color: 'text-status-nodrink', ring: 'border-l-status-nodrink' },
    { key: 'low', value: data.running_low, Icon: TriangleAlert, color: 'text-status-boil', ring: 'border-l-status-boil' },
    { key: 'delivered', value: data.delivered_today, Icon: CircleCheckBig, color: 'text-status-safe', ring: 'border-l-status-safe' },
    { key: 'advisories', value: data.active_advisories, Icon: Flame, color: 'text-[#6D28D9]', ring: 'border-l-[#6D28D9]' },
  ] as const

  return (
    <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ key, value, Icon, color, ring }) => (
        <li key={key} className={`card !p-4 border-l-8 ${ring}`}>
          <p className={`flex items-center gap-2 font-semibold ${color}`}>
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="text-ink">{t.dispatcher.cards[key]}</span>
          </p>
          <p className="mt-1 text-4xl font-bold text-navy" aria-live="polite">
            {value}
          </p>
          <p className="text-slate-600">{t.dispatcher.cardHelp[key]}</p>
        </li>
      ))}
    </ul>
  )
}
