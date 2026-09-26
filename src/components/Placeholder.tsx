import type { ReactNode } from 'react'
import { Construction } from 'lucide-react'
import { useT } from '../i18n'

export function Placeholder({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  const t = useT()
  return (
    <section className="card">
      <h2 className="text-2xl font-bold text-navy mb-2">{title}</h2>
      <p className="mb-4">{description}</p>
      <p className="inline-flex items-center gap-2 text-slate-700">
        <Construction aria-hidden="true" className="h-5 w-5" />
        {t.comingSoon}
      </p>
      {children}
    </section>
  )
}
