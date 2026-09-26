import { Info } from 'lucide-react'
import { useT } from '../i18n'

export function Footer() {
  const t = useT()
  return (
    <footer className="bg-white border-t border-slate-200">
      <p className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2 text-slate-700">
        <Info aria-hidden="true" className="h-5 w-5" />
        {t.footer}
      </p>
    </footer>
  )
}
