import { useState, type FormEvent } from 'react'
import { KeyRound, Lock, LockOpen, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/useAppStore'

/** Staff mode: a DEMO PIN gate for issuing or lifting advisories. */
export function StaffGate() {
  const t = useT()
  const s = t.staff
  const staffPin = useAppStore((st) => st.staffPin)
  const unlockStaff = useAppStore((st) => st.unlockStaff)
  const lockStaff = useAppStore((st) => st.lockStaff)
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    const ok = unlockStaff(pin)
    setWrong(!ok)
    setPin('')
  }

  return (
    <section aria-labelledby="staff-heading" className={`card border-2 ${staffPin ? 'border-teal' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="staff-heading" className="flex items-center gap-2 text-xl font-bold text-navy">
          {staffPin ? <LockOpen aria-hidden="true" className="h-6 w-6 text-teal-dark" /> : <Lock aria-hidden="true" className="h-6 w-6" />}
          {s.mode}
        </h2>
        {staffPin && (
          <span className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-3 py-1 font-semibold text-teal-dark">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            {s.unlocked}
          </span>
        )}
      </div>
      <p className="mt-2 text-slate-700">{s.note}</p>
      {staffPin ? (
        <button type="button" onClick={lockStaff} className="tap mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 px-4 font-semibold text-navy hover:bg-slate-50">
          <Lock aria-hidden="true" className="h-5 w-5" />
          {s.lock}
        </button>
      ) : (
        <form onSubmit={submit} className="mt-3">
          <p className="text-slate-600">{s.locked}</p>
          <label htmlFor="staff-pin" className="mt-2 block font-semibold text-navy">
            {s.pinLabel}
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            <input
              id="staff-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              aria-describedby="staff-pin-demo"
              aria-invalid={wrong || undefined}
              className="tap w-40 rounded-xl border-2 border-slate-300 px-3 text-xl tracking-widest"
            />
            <button type="submit" className="tap inline-flex items-center gap-2 rounded-xl bg-navy px-4 font-bold text-white hover:bg-glacier">
              <KeyRound aria-hidden="true" className="h-5 w-5" />
              {s.unlock}
            </button>
          </div>
          <p id="staff-pin-demo" className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-status-boil px-3 py-0.5 font-semibold text-status-boil">
            <TriangleAlert aria-hidden="true" className="h-4 w-4" />
            {s.demoPin}
          </p>
          {wrong && (
            <p role="alert" className="mt-2 flex items-center gap-2 font-semibold text-status-nodrink">
              <TriangleAlert aria-hidden="true" className="h-5 w-5" />
              {s.wrongPin}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
