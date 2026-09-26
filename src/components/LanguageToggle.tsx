import { Languages } from 'lucide-react'
import { LANGUAGES, useT } from '../i18n'
import { useAppStore } from '../store/useAppStore'

export function LanguageToggle() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)

  return (
    <div role="group" aria-label={t.language} className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
      <Languages aria-hidden="true" className="h-5 w-5 mx-1 text-slate-200" />
      {LANGUAGES.map((l) => {
        const active = l.code === lang
        return (
          <button
            key={l.code}
            type="button"
            lang={l.htmlLang}
            aria-pressed={active}
            onClick={() => setLang(l.code)}
            className={`tap px-3 rounded-md font-semibold transition-colors focus-visible:outline-white ${
              active ? 'bg-white text-navy' : 'text-white hover:bg-white/20'
            }`}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
