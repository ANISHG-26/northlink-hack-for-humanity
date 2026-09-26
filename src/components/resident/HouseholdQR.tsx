import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useT } from '../../i18n'

/** QR generated locally (works offline). Encodes just the house code. */
export function HouseholdQR({ householdId }: { householdId: string }) {
  const t = useT()
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(householdId, { width: 480, margin: 1, color: { dark: '#0F2A44', light: '#FFFFFF' } })
      .then(setSrc)
      .catch(() => setSrc(null))
  }, [householdId])

  return (
    <section aria-labelledby="qr-heading" className="card flex flex-col sm:flex-row items-center gap-5">
      <div className="rounded-xl border-2 border-slate-200 p-3 bg-white">
        {src ? (
          <img src={src} alt={t.qr.alt(householdId)} className="h-48 w-48" />
        ) : (
          <div className="h-48 w-48 bg-slate-100 rounded" aria-hidden="true" />
        )}
      </div>
      <div className="text-center sm:text-left">
        <h2 id="qr-heading" className="text-xl font-bold text-navy">
          {t.qr.title}
        </h2>
        <p className="mt-2 text-4xl font-bold tracking-wider text-navy">{householdId}</p>
        <p className="mt-2 text-lg text-slate-700">{t.qr.help}</p>
      </div>
    </section>
  )
}
