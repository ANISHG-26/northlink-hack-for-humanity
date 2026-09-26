import { WifiOff } from 'lucide-react'
import { useT } from '../i18n'
import { useFormat } from '../i18n/format'

export function OfflineBanner({ cachedAt }: { cachedAt?: string }) {
  const t = useT()
  const fmt = useFormat()
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border-2 border-slate-300 bg-slate-100 px-4 py-3 text-ink">
      <WifiOff aria-hidden="true" className="h-6 w-6 shrink-0 text-slate-700" />
      <p>
        <span className="font-semibold">{t.offlineBanner}</span>
        {cachedAt && <span className="text-slate-600"> · {t.savedAt(`${fmt.day(cachedAt)}, ${fmt.time(cachedAt)}`)}</span>}
      </p>
    </div>
  )
}
