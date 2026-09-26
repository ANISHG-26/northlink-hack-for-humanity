import { Wifi, WifiOff } from 'lucide-react'
import { useT } from '../i18n'
import { useAppStore } from '../store/useAppStore'

/** Connection state — icon + text, never colour alone. */
export function OnlineIndicator() {
  const t = useT()
  const isOnline = useAppStore((s) => s.isOnline)
  const Icon = isOnline ? Wifi : WifiOff
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${
        isOnline ? 'bg-white/10 text-white' : 'bg-amber-100 text-status-boil'
      }`}
    >
      <Icon aria-hidden="true" className="h-5 w-5" />
      {isOnline ? t.online : t.offline}
    </span>
  )
}
