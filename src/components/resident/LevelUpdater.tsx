import { useState } from 'react'
import { CircleCheck, CloudUpload, TriangleAlert } from 'lucide-react'
import type { LevelChoice } from '../../api/types'
import { useT } from '../../i18n'

const LEVELS: { id: LevelChoice; fraction: number }[] = [
  { id: 'full', fraction: 1 },
  { id: 'three_quarters', fraction: 0.75 },
  { id: 'half', fraction: 0.5 },
  { id: 'quarter', fraction: 0.25 },
  { id: 'empty', fraction: 0 },
]

type Result = 'saved' | 'queued' | 'error' | null

function MiniTank({ fraction }: { fraction: number }) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true" className="h-9 w-7">
      <rect x="2" y="2" width="20" height="28" rx="4" fill="#fff" stroke="currentColor" strokeWidth="2.5" />
      {fraction > 0 && <rect x="5" y={5 + 22 * (1 - fraction)} width="14" height={22 * fraction} rx="1.5" fill="#0E9AA7" />}
    </svg>
  )
}

export function LevelUpdater({ onSubmit }: { onSubmit: (level: LevelChoice) => Promise<'saved' | 'queued'> }) {
  const t = useT()
  const [busy, setBusy] = useState<LevelChoice | null>(null)
  const [chosen, setChosen] = useState<LevelChoice | null>(null)
  const [result, setResult] = useState<Result>(null)

  async function choose(level: LevelChoice) {
    setBusy(level)
    setResult(null)
    try {
      setResult(await onSubmit(level))
      setChosen(level)
    } catch {
      setResult('error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-labelledby="level-heading" className="card">
      <h2 id="level-heading" className="text-xl font-bold text-navy">
        {t.level.title}
      </h2>
      <p className="mt-1 text-slate-600">{t.level.help}</p>
      <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
        {LEVELS.map(({ id, fraction }) => {
          const selected = chosen === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              disabled={busy !== null}
              aria-pressed={selected}
              className={`min-h-[5.5rem] flex flex-col items-center justify-center gap-1 rounded-xl border-2 font-bold transition-colors disabled:cursor-wait ${
                selected
                  ? 'border-teal bg-teal/10 text-navy'
                  : 'border-slate-200 bg-white text-navy hover:border-glacier hover:bg-slate-50'
              } ${busy === id ? 'animate-pulse' : ''}`}
            >
              <MiniTank fraction={fraction} />
              <span className="text-base sm:text-lg">{t.level[id]}</span>
            </button>
          )
        })}
      </div>
      <div aria-live="polite" className="min-h-[2rem] mt-3">
        {result === 'saved' && (
          <p className="inline-flex items-center gap-2 text-status-safe font-semibold">
            <CircleCheck aria-hidden="true" className="h-5 w-5" />
            {t.level.saved}
          </p>
        )}
        {result === 'queued' && (
          <p className="inline-flex items-center gap-2 text-glacier font-semibold">
            <CloudUpload aria-hidden="true" className="h-5 w-5" />
            {t.level.queued}
          </p>
        )}
        {result === 'error' && (
          <p className="inline-flex items-center gap-2 text-status-nodrink font-semibold">
            <TriangleAlert aria-hidden="true" className="h-5 w-5" />
            {t.level.error}
          </p>
        )}
      </div>
    </section>
  )
}
