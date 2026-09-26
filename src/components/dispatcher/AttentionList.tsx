import { ClipboardList, Droplet, GlassWater, MessageSquareText, Siren, Thermometer, Waves, Wrench } from 'lucide-react'
import type { AttentionItem, AttentionKind } from '../../api/types'
import { useT } from '../../i18n'
import { UrgencyBadge } from '../driver/UrgencyBadge'

const ICONS: Record<AttentionKind, typeof Siren> = {
  sewage_full: Siren,
  out_of_water: Droplet,
  clean_water_low: Droplet,
  illness: Thermometer,
  water_quality: GlassWater,
  possible_leak: Waves,
  tank_damage: Wrench,
  other: MessageSquareText,
}

const MAX_SHOWN = 12

/** Reports and household states needing staff attention, highest priority first. */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  const t = useT()
  const d = t.dispatcher
  return (
    <section aria-labelledby="attention-heading" className="card">
      <h2 id="attention-heading" className="flex items-center gap-2 text-xl font-bold text-navy">
        <ClipboardList aria-hidden="true" className="h-6 w-6 text-glacier" />
        {d.attentionTitle}
      </h2>
      <p className="text-slate-600">{d.attentionNote}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-slate-600">{d.noAttention}</p>
      ) : (
        <ol className="mt-3 divide-y divide-slate-100">
          {items.slice(0, MAX_SHOWN).map((it) => {
            const Icon = ICONS[it.kind]
            return (
              <li key={it.id} className="flex items-start gap-3 py-3">
                <Icon aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-navy" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-lg font-bold text-navy">{it.household_id}</span>
                    <span className="font-semibold text-ink">{d.attentionKinds[it.kind]}</span>
                    <UrgencyBadge urgency={it.priority} />
                  </div>
                  <p className="text-slate-700">{it.why}</p>
                  {it.detail && <p className="text-slate-500">“{it.detail}”</p>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
