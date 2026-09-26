import { useAppStore, type Lang } from '../store/useAppStore'
import { en, type Strings } from './en'
import { fr } from './fr'
import { iu } from './iu'

export type { Lang, Strings }

export const strings: Record<Lang, Strings> = { en, fr, iu }

// Each language is named in itself. "ᐃᓄᒃᑎᑐᑦ" (Inuktitut) is the
// established name of the language, not an invented translation.
export const LANGUAGES: { code: Lang; label: string; htmlLang: string }[] = [
  { code: 'en', label: 'English', htmlLang: 'en' },
  { code: 'fr', label: 'Français', htmlLang: 'fr' },
  { code: 'iu', label: 'ᐃᓄᒃᑎᑐᑦ', htmlLang: 'iu' },
]

export function useT(): Strings {
  return strings[useAppStore((s) => s.lang)]
}
