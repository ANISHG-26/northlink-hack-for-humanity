import { useEffect, useRef, useState } from 'react'
import {
  Building2,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  Copy,
  FlaskConical,
  Landmark,
  LoaderCircle,
  MessageSquareText,
  Plane,
  Ship,
  ShoppingCart,
  TriangleAlert,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import type { Partner, PartStatus, SealiftPlan } from '../api/types'
import { OfflineBanner } from '../components/OfflineBanner'
import { useT } from '../i18n'
import { useFormat } from '../i18n/format'
import { useAppStore } from '../store/useAppStore'
import { StaffGate } from '../components/dispatcher/StaffGate'
import { RepairsPanel } from '../components/operations/RepairsPanel'
import { useOperationsText } from '../i18n/operations'

// Colour always paired with icon + text.
const STATUS_STYLES: Record<PartStatus, { Icon: typeof CircleCheck; cls: string }> = {
  ok: { Icon: CircleCheck, cls: 'bg-green-50 text-status-safe border-status-safe' },
  order: { Icon: Ship, cls: 'bg-amber-50 text-status-boil border-status-boil' },
  critical: { Icon: Plane, cls: 'bg-status-nodrink text-white border-status-nodrink' },
}

const PARTNER_ICONS = { health: FlaskConical, provincial: Landmark, federal: Building2, supplier: ShoppingCart }

function PartBadge({ status }: { status: PartStatus }) {
  const t = useT()
  const { Icon, cls } = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-0.5 font-semibold ${cls}`}>
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      {t.parts.status[status]}
    </span>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(
          () => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
          },
          () => {},
        )
      }
      className="tap inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 px-4 font-semibold text-navy hover:bg-slate-50"
    >
      {copied ? <ClipboardCheck aria-hidden="true" className="h-5 w-5 text-status-safe" /> : <Copy aria-hidden="true" className="h-5 w-5" />}
      <span aria-live="polite">{copied ? t.parts.copied : label}</span>
    </button>
  )
}

function DraftDialog({ partner, plan, onClose }: { partner: Partner; plan: SealiftPlan | null; onClose: () => void }) {
  const t = useT()
  const p = t.parts
  const ref = useRef<HTMLDialogElement>(null)
  const items = plan?.order.map((o) => `- ${o.name}: ${o.quantity} (${o.shipping === 'air_freight' ? p.airFreight : p.sealift})`).join('\n')
  const body =
    partner.request_template === 'parts'
      ? items
        ? p.drafts.parts(items)
        : p.drafts.noParts
      : partner.request_template === 'water_testing'
        ? p.drafts.water_testing
        : p.drafts.general
  const [text, setText] = useState(`${p.drafts.greeting}\n\n${p.drafts.intro}\n\n${body}\n\n${p.drafts.closing}`)

  useEffect(() => {
    const dlg = ref.current
    dlg?.showModal()
    return () => dlg?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby="draft-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="w-[min(40rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-navy/60"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 id="draft-title" className="text-xl font-bold text-navy">
          {p.draftTitle(partner.name)}
        </h2>
        <button type="button" onClick={onClose} className="tap inline-flex items-center justify-center rounded-lg hover:bg-slate-100">
          <X aria-hidden="true" className="h-6 w-6" />
          <span className="sr-only">{p.close}</span>
        </button>
      </div>
      <div className="px-5 py-4">
        <p className="text-slate-600">{p.draftHelp}</p>
        <label htmlFor="draft-text" className="sr-only">
          {p.draftTitle(partner.name)}
        </label>
        <textarea
          id="draft-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          className="mt-3 block w-full rounded-xl border-2 border-slate-300 p-3 font-mono text-base"
        />
      </div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-5 py-4">
        <button type="button" onClick={onClose} className="tap rounded-xl border-2 border-slate-300 px-5 font-semibold text-slate-700 hover:bg-slate-50">
          {p.close}
        </button>
        <CopyButton text={text} label={p.copy} />
      </div>
    </dialog>
  )
}

export function PartsView() {
  const ops = useOperationsText()
  const t = useT()
  const p = t.parts
  const fmt = useFormat()
  const isOnline = useAppStore((s) => s.isOnline)
  const [plan, setPlan] = useState<SealiftPlan | null>(null)
  const [partners, setPartners] = useState<Partner[]>([])
  const [cachedAt, setCachedAt] = useState<string | undefined>()
  const [error, setError] = useState(false)
  const [showOrder, setShowOrder] = useState(false)
  const [draftFor, setDraftFor] = useState<Partner | null>(null)

  useEffect(() => {
    api
      .sealiftPlan()
      .then((r) => {
        setPlan(r.data)
        setCachedAt(r.fromCache ? r.cachedAt : undefined)
      })
      .catch(() => setError(true))
    api
      .partners()
      .then((r) => setPartners(r.data))
      .catch(() => {})
  }, [])

  if (!plan) {
    return (
      <div className="card flex items-center justify-center gap-3 py-12" role="status">
        {error ? (
          <>
            <TriangleAlert aria-hidden="true" className="h-6 w-6 text-status-nodrink" />
            {t.loadError}
          </>
        ) : (
          <>
            <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-teal" />
            {t.loading}
          </>
        )}
      </div>
    )
  }

  const orderText = plan.order
    .map((o) => `${o.shipping === 'air_freight' ? p.airFreight : p.sealift}: ${o.name}, ${o.quantity}`)
    .join('\n')

  return (
    <div className="flex flex-col gap-5">
      {(!isOnline || cachedAt) && <OfflineBanner cachedAt={cachedAt} />}
      <StaffGate />
      <RepairsPanel onChange={() => { api.sealiftPlan().then(r => { setPlan(r.data); setCachedAt(r.fromCache ? r.cachedAt : undefined) }).catch(() => setError(true)) }} />

      {/* Sealift deadline */}
      <section aria-labelledby="deadline-heading" className="rounded-2xl bg-navy text-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="deadline-heading" className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Ship aria-hidden="true" className="h-8 w-8 text-teal shrink-0" />
              {p.deadlineTitle(plan.days_until_deadline)}
            </h2>
            <p className="mt-1 text-slate-200">{p.deadlineDate(fmt.date(plan.next_sealift))}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowOrder((s) => !s)}
            aria-expanded={showOrder}
            aria-controls="order-summary"
            className="tap inline-flex items-center gap-2 rounded-xl bg-teal px-5 font-bold text-white hover:bg-glacier"
          >
            <ClipboardList aria-hidden="true" className="h-5 w-5" />
            {showOrder ? p.hideOrder : p.generate}
          </button>
        </div>

        <h3 className="mt-4 font-semibold text-slate-200">{p.atRisk}</h3>
        {plan.at_risk.length === 0 ? (
          <p className="mt-1">{p.noneAtRisk}</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {plan.at_risk.map((part) => (
              <li key={part.id} className="rounded-xl bg-white text-ink p-3">
                <p className="font-bold text-navy">{part.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <PartBadge status={part.status} />
                  {part.runs_out_on && <span className="text-slate-600">{p.runsOut(fmt.date(part.runs_out_on))}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}

        {showOrder && (
          <div id="order-summary" className="mt-4 rounded-xl bg-white text-ink p-4">
            <h3 className="text-xl font-bold text-navy">{p.orderTitle}</h3>
            <p className="mt-1 text-slate-600">{p.orderNote(plan.cover_months, plan.safety_buffer_pct)}</p>
            {(['air_freight', 'sealift'] as const).map((ship) => {
              const lines = plan.order.filter((o) => o.shipping === ship)
              if (!lines.length) return null
              const Icon = ship === 'air_freight' ? Plane : Ship
              return (
                <div key={ship} className="mt-3">
                  <h4 className="flex items-center gap-2 font-semibold text-navy">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                    {ship === 'air_freight' ? p.airFreight : p.sealift}
                  </h4>
                  <ul className="mt-1 divide-y divide-slate-100">
                    {lines.map((o) => (
                      <li key={`${ship}-${o.part_id}`} className="flex justify-between gap-3 py-2">
                        <span>{o.name}</span>
                        <span className="font-bold whitespace-nowrap">{p.qty(o.quantity, o.unit)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            <div className="mt-3">
              <CopyButton text={orderText} label={p.copy} />
            </div>
          </div>
        )}
      </section>

      {/* Parts table */}
      <section aria-labelledby="parts-heading" className="card">
        <h2 id="parts-heading" className="text-xl font-bold text-navy">
          {p.tableTitle}
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-600">
                <th scope="col" className="py-2 pr-3 font-semibold">{p.cols.part}</th>
                <th scope="col" className="py-2 px-3 font-semibold text-right">{p.cols.stock}</th>
                <th scope="col" className="py-2 px-3 font-semibold text-right">{p.cols.use}</th>
                <th scope="col" className="py-2 px-3 font-semibold text-right">{p.cols.months}</th>
                <th scope="col" className="py-2 pl-3 font-semibold">{p.cols.status}</th>
              </tr>
            </thead>
            <tbody>
              {plan.parts.map((part) => (
                <tr key={part.id} className="border-b border-slate-100 align-middle">
                  <th scope="row" className="py-3 pr-3 font-semibold text-navy">{part.name}</th>
                  <td className="py-3 px-3 text-right tabular-nums">{fmt.number(part.on_hand)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{fmt.number(part.monthly_use)}</td>
                  <td className="py-3 px-3 text-right tabular-nums font-semibold">{p.months(part.months_left)}</td>
                  <td className="py-3 pl-3">
                    <PartBadge status={part.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Partners */}
      <section aria-labelledby="partners-heading">
        <h2 id="partners-heading" tabIndex={-1} className="text-2xl font-bold text-navy scroll-mt-24">
          {p.partnersTitle}
        </h2>
        <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-status-boil px-3 py-1 font-semibold text-status-boil">
          <TriangleAlert aria-hidden="true" className="h-5 w-5" />
          {p.partnersNote}
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {partners.map((partner) => {
            const Icon = PARTNER_ICONS[partner.type]
            return (
              <li key={partner.id} className="card flex flex-col">
                <h3 className="flex items-center gap-3 text-lg font-bold text-navy">
                  <span className="rounded-full bg-glacier/10 p-2 text-glacier">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  {partner.name}
                </h3>
                <p className="mt-2 flex items-center gap-2 text-status-boil"><TriangleAlert aria-hidden="true" className="h-5 w-5 shrink-0" />{ops.unverified}</p>
                <p className="mt-3 font-semibold text-slate-600">{p.helpsWith}</p>
                <ul className="mt-1 list-disc pl-6 text-ink">
                  {partner.helps_with.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                <p className="mt-3 text-slate-500">{p.contactTbc}</p>
                <button
                  type="button"
                  onClick={() => setDraftFor(partner)}
                  className="tap mt-4 self-start inline-flex items-center gap-2 rounded-xl bg-glacier px-4 font-bold text-white hover:bg-navy"
                >
                  <MessageSquareText aria-hidden="true" className="h-5 w-5" />
                  {p.requestHelp}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {draftFor && <DraftDialog partner={draftFor} plan={plan} onClose={() => setDraftFor(null)} />}
    </div>
  )
}
