import { CircleCheck, Flame, OctagonX } from 'lucide-react'

export type WaterStatus = 'safe' | 'boil' | 'nodrink'

// Status colour is ALWAYS paired with an icon and text (never colour alone).
const STYLES: Record<WaterStatus, { Icon: typeof CircleCheck; cls: string }> = {
  safe: { Icon: CircleCheck, cls: 'bg-status-safe' },
  boil: { Icon: Flame, cls: 'bg-status-boil' },
  nodrink: { Icon: OctagonX, cls: 'bg-status-nodrink' },
}

export function StatusBadge({ status, label }: { status: WaterStatus; label: string }) {
  const { Icon, cls } = STYLES[status]
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold text-white ${cls}`}>
      <Icon aria-hidden="true" className="h-5 w-5" />
      {label}
    </span>
  )
}
