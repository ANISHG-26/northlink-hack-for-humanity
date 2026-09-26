import { Droplet } from 'lucide-react'
import { useT } from '../i18n'
import { LanguageToggle } from './LanguageToggle'
import { OnlineIndicator } from './OnlineIndicator'

export function Header() {
  const t = useT()
  return (
    <header className="bg-navy text-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Droplet aria-hidden="true" className="h-8 w-8 text-teal fill-teal" strokeWidth={1.75} />
          <div>
            <h1 className="text-2xl font-bold leading-tight">{t.appName}</h1>
            <p className="text-base text-slate-200 leading-tight">{t.tagline}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OnlineIndicator />
          <LanguageToggle />
        </div>
      </div>
    </header>
  )
}
