import { LANGUAGES, useT } from '../i18n'
import { useAppStore } from '../store/useAppStore'

/** Frosted pill language switcher (reference `.lang`). */
export function LanguageToggle() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  return (
    <div className="lang" role="group" aria-label={t.language}>
      {LANGUAGES.map((l) => (
        <button key={l.code} type="button" lang={l.htmlLang} aria-pressed={l.code === lang} onClick={() => setLang(l.code)}>
          {l.label}
        </button>
      ))}
    </div>
  )
}
