import { CircleCheck, Flame, OctagonX } from 'lucide-react'
import type { WaterStatus } from '../api/types'

export type { WaterStatus }

// Status colour is ALWAYS paired with an icon and text (never colour alone).
export const STATUS_STYLES: Record<WaterStatus, { Icon: typeof CircleCheck; solid: string; soft: string }> = {
  safe: { Icon: CircleCheck, solid: 'bg-status-safe', soft: 'bg-green-50 border-status-safe text-status-safe' },
  boil: { Icon: Flame, solid: 'bg-status-boil', soft: 'bg-amber-50 border-status-boil text-status-boil' },
  nodrink: { Icon: OctagonX, solid: 'bg-status-nodrink', soft: 'bg-red-50 border-status-nodrink text-status-nodrink' },
}

export function StatusBadge({ status, label }: { status: WaterStatus; label: string }) {
  const { Icon, solid } = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold text-white ${solid}`}>
      <Icon aria-hidden="true" className="h-5 w-5" />
      {label}
    </span>
  )
}
