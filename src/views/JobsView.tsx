import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowDown,
  ArrowRight,
  BadgeDollarSign,
  CircleCheckBig,
  Cpu,
  GraduationCap,
  HandHeart,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Sparkles,
  TestTube,
  Truck,
  UserRoundPlus,
  X,
} from 'lucide-react'
import { useT } from '../i18n'

type RoleKey = 'driver' | 'technician' | 'monitor' | 'coordinator' | 'ambassador'

const ROLES: { key: RoleKey; Icon: typeof Truck; accent: string }[] = [
  { key: 'driver', Icon: Truck, accent: 'bg-navy' },
  { key: 'technician', Icon: Cpu, accent: 'bg-glacier' },
  { key: 'monitor', Icon: TestTube, accent: 'bg-teal-dark' },
  { key: 'coordinator', Icon: LayoutDashboard, accent: 'bg-[#6D28D9]' },
  { key: 'ambassador', Icon: HandHeart, accent: 'bg-status-boil' },
]

const WHY_ICONS = [BadgeDollarSign, GraduationCap, Home, Sparkles, HeartHandshake]
const INTEREST_KEY = 'northlink:interest'

function InterestDialog({ role, onClose }: { role: RoleKey; onClose: () => void }) {
  const t = useT()
  const j = t.jobs
  const ref = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [chosen, setChosen] = useState<RoleKey>(role)
  const [contact, setContact] = useState<'phone' | 'text' | 'inperson'>('phone')
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    const dlg = ref.current
    dlg?.showModal()
    return () => dlg?.close()
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    try {
      const list = JSON.parse(localStorage.getItem(INTEREST_KEY) ?? '[]')
      list.push({ name: name.trim(), role: chosen, contact, at: new Date().toISOString() })
      localStorage.setItem(INTEREST_KEY, JSON.stringify(list))
    } catch {
      /* the thank-you still shows; nothing leaves the device either way */
    }
    setDone(name.trim())
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="interest-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="w-[min(34rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-navy/60"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 id="interest-title" className="flex items-center gap-2 text-xl font-bold text-navy">
          <UserRoundPlus aria-hidden="true" className="h-6 w-6 text-teal-dark" />
          {j.formTitle}
        </h2>
        <button type="button" onClick={onClose} aria-label={j.cancel} className="tap inline-flex items-center justify-center rounded-lg hover:bg-slate-100">
          <X aria-hidden="true" className="h-6 w-6" />
        </button>
      </div>
      {done !== null ? (
        <div className="px-5 py-6" role="status">
          <p className="flex items-start gap-3 text-lg font-semibold text-status-safe">
            <CircleCheckBig aria-hidden="true" className="h-7 w-7 shrink-0" />
            {j.thanks(done)}
          </p>
          <p className="mt-2 text-slate-600">{j.savedLocally}</p>
          <button type="button" onClick={onClose} className="tap mt-5 rounded-xl bg-navy px-6 font-bold text-white hover:bg-glacier">
            {t.report.done}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4 px-5 py-4">
          <div>
            <label htmlFor="interest-name" className="font-semibold text-navy">
              {j.name}
            </label>
            <input
              id="interest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="tap mt-1 block w-full rounded-xl border-2 border-slate-300 px-3"
            />
          </div>
          <div>
            <label htmlFor="interest-role" className="font-semibold text-navy">
              {j.role}
            </label>
            <select
              id="interest-role"
              value={chosen}
              onChange={(e) => setChosen(e.target.value as RoleKey)}
              className="tap mt-1 block w-full rounded-xl border-2 border-slate-300 bg-white px-3"
            >
              {ROLES.map(({ key }) => (
                <option key={key} value={key}>
                  {j.roles[key].title}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="font-semibold text-navy">{j.contact}</legend>
            <div className="mt-1 flex flex-col gap-2">
              {(['phone', 'text', 'inperson'] as const).map((c) => (
                <label key={c} className="tap flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 px-3 has-[:checked]:border-teal has-[:checked]:bg-teal/10">
                  <input type="radio" name="contact" value={c} checked={contact === c} onChange={() => setContact(c)} className="h-5 w-5 accent-teal" />
                  {j.contactOptions[c]}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-slate-600">{j.savedLocally}</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="tap rounded-xl border-2 border-slate-300 px-5 font-semibold text-slate-700 hover:bg-slate-50">
              {j.cancel}
            </button>
            <button type="submit" className="tap rounded-xl bg-navy px-6 font-bold text-white hover:bg-glacier">
              {j.submit}
            </button>
          </div>
        </form>
      )}
    </dialog>
  )
}

export function JobsView() {
  const t = useT()
  const j = t.jobs
  const [formFor, setFormFor] = useState<RoleKey | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="jobs-title" className="rounded-2xl bg-navy p-6 text-white">
        <h2 id="jobs-title" className="text-3xl font-bold">
          {j.title}
        </h2>
        <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-accent" />
        <p className="mt-4 max-w-3xl text-lg">{j.intro}</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 font-semibold">
          <BadgeDollarSign aria-hidden="true" className="h-5 w-5" />
          {j.payNote}
        </p>
      </section>

      {/* Why these jobs are worth it */}
      <section aria-labelledby="jobs-why">
        <h2 id="jobs-why" className="text-2xl font-bold text-navy">
          {j.whyTitle}
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {j.why.map((w, i) => {
            const Icon = WHY_ICONS[i] ?? Sparkles
            return (
              <li key={w} className="card flex items-center gap-3 !p-4">
                <Icon aria-hidden="true" className="h-7 w-7 shrink-0 text-teal-dark" />
                <span className="font-semibold text-ink">{w}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Career ladder */}
      <section aria-labelledby="jobs-ladder" className="card">
        <h2 id="jobs-ladder" className="text-2xl font-bold text-navy">
          {j.ladderTitle}
        </h2>
        <ol aria-label={j.ladderLabel} className="mt-4 flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          {j.ladder.map((step, i) => (
            <li key={step} className="flex flex-col items-center gap-2 md:flex-1 md:flex-row">
              <span className="flex w-full items-center gap-3 rounded-2xl border-2 border-teal bg-teal/10 px-4 py-3 md:justify-center">
                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-lg font-bold text-navy">{step}</span>
              </span>
              {i < j.ladder.length - 1 && (
                <>
                  <ArrowDown aria-hidden="true" className="h-6 w-6 text-teal-dark md:hidden" />
                  <ArrowRight aria-hidden="true" className="hidden h-6 w-6 shrink-0 text-teal-dark md:block" />
                </>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Roles */}
      <section aria-labelledby="jobs-roles">
        <h2 id="jobs-roles" className="sr-only">
          {j.title}
        </h2>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ROLES.map(({ key, Icon, accent }) => {
            const r = j.roles[key]
            return (
              <li key={key} className="card flex flex-col">
                <div className="flex items-start gap-3">
                  <span className={`rounded-2xl p-3 text-white ${accent}`}>
                    <Icon aria-hidden="true" className="h-7 w-7" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-navy">{r.title}</h3>
                    {'tag' in r && <p className="font-semibold text-status-boil">{r.tag}</p>}
                  </div>
                </div>
                <h4 className="mt-4 font-semibold text-slate-600">{j.whatYouDo}</h4>
                <p className="text-ink">{r.does}</p>
                <h4 className="mt-3 font-semibold text-slate-600">{j.skills}</h4>
                <ul className="list-disc pl-6 text-ink">
                  {r.skills.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <h4 className="mt-3 font-semibold text-slate-600">{j.pathway}</h4>
                <p className="flex items-start gap-2 text-ink">
                  <GraduationCap aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-teal-dark" />
                  {r.pathway}
                </p>
                <button
                  type="button"
                  onClick={() => setFormFor(key)}
                  aria-label={`${j.interested}: ${r.title}`}
                  className="tap mt-5 inline-flex items-center justify-center gap-2 self-start rounded-full bg-navy px-5 font-bold text-white hover:bg-glacier"
                >
                  <UserRoundPlus aria-hidden="true" className="h-5 w-5" />
                  {j.interested}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-slate-600">{j.payNote}.</p>
      </section>

      {formFor && <InterestDialog role={formFor} onClose={() => setFormFor(null)} />}
    </div>
  )
}
