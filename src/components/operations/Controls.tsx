import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useOperationsText } from '../../i18n/operations'

export const inputClass = 'tap w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-ink disabled:opacity-50'
export const buttonClass = 'tap rounded-xl bg-navy px-4 py-2 font-semibold text-white hover:bg-glacier disabled:opacity-50'
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1 font-semibold text-navy">{label}{children}</label>
}
export function ErrorNotice() {
  const t = useOperationsText()
  return <p role="alert" className="flex items-start gap-2 text-status-nodrink"><TriangleAlert aria-hidden="true" className="h-6 w-6 shrink-0" />{t.error}</p>
}
export function localTime() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
