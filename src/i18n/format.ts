import { useAppStore, type Lang } from '../store/useAppStore'
import type { Strings } from './en'
import { useT } from '.'

// Inukjuak is on Eastern Time — show community-local times regardless of viewer.
export const COMMUNITY_TZ = 'America/Toronto'

// Inuktitut UI text is English placeholders for now, so format like English.
// en-US gives "1:40 PM" as in the approved design (en-CA writes "p.m.").
const LOCALES: Record<Lang, string> = { en: 'en-US', fr: 'fr-CA', iu: 'en-US' }

function dayKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: COMMUNITY_TZ })
}

export function makeFormatters(lang: Lang, t: Strings) {
  const locale = LOCALES[lang]
  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: COMMUNITY_TZ }).format(new Date(iso))
  const date = (iso: string) => {
    // Plain dates ("2026-09-25") are calendar days — format at noon to avoid TZ drift.
    const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso)
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      ...(iso.length === 10 ? {} : { timeZone: COMMUNITY_TZ }),
    }).format(d)
  }
  /** "today" / "tomorrow" / "Monday, September 28" */
  const day = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 86_400_000)
    if (dayKey(d) === dayKey(now)) return t.today
    if (dayKey(d) === dayKey(tomorrow)) return t.tomorrow
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: COMMUNITY_TZ,
    }).format(d)
  }
  const number = (n: number) => new Intl.NumberFormat(locale).format(n)
  return { time, date, day, number }
}

export function useFormat() {
  const lang = useAppStore((s) => s.lang)
  const t = useT()
  return makeFormatters(lang, t)
}
