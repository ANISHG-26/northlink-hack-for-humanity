import { useEffect, useRef, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useT } from '../../i18n'

const READER_ID = 'northlink-qr-reader'

/** Camera QR scanner (html5-qrcode, loaded on demand). Calls onScan once, then stops. */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const t = useT()
  const [error, setError] = useState(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    let cancelled = false
    let scanner: import('html5-qrcode').Html5Qrcode | null = null
    let running = false

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return
        scanner = new Html5Qrcode(READER_ID, { verbose: false })
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            if (!running) return
            running = false
            void scanner?.stop().catch(() => {})
            onScanRef.current(text)
          },
          () => {},
        )
        running = true
        if (cancelled) void scanner.stop().catch(() => {})
      } catch {
        if (!cancelled) setError(true)
      }
    }
    void start()

    return () => {
      cancelled = true
      if (scanner && running) {
        running = false
        void scanner.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="mt-4">
      {error ? (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-amber-50 border-2 border-status-boil p-3 font-semibold text-status-boil">
          <TriangleAlert aria-hidden="true" className="h-5 w-5 shrink-0" />
          {t.driver.cameraError}
        </p>
      ) : (
        <>
          <div id={READER_ID} className="overflow-hidden rounded-xl bg-navy min-h-[240px]" />
          <p className="mt-2 text-slate-600">{t.driver.scanHelp}</p>
        </>
      )}
    </div>
  )
}
