import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import QRCode from 'qrcode'
import { api } from '../api/client'
import { DELIVERY_STAGES, type Classification, type HouseholdStatus, type LevelChoice, type ReportType } from '../api/types'
import { OfflineBanner } from '../components/OfflineBanner'
import { AdvisoryNotice } from '../components/resident/AdvisoryNotice'
import { SensorPage } from '../components/resident/SensorPage'
import { useT } from '../i18n'
import { useFormat } from '../i18n/format'
import { RESIDENT_HOUSEHOLD, useAppStore } from '../store/useAppStore'

const POLL_MS = 15_000
const LEVELS: LevelChoice[] = ['full', 'three_quarters', 'half', 'quarter', 'empty']
const ALL_TYPES: ReportType[] = ['clean_water_low', 'sewage_full', 'water_quality', 'tank_damage', 'illness', 'other']

function minutesSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
}

/** 3.4 -> "3.4", 12.2 -> "12" */
function daysNumber(n: number) {
  return n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10)
}

function Tank({ percent, color, label, lightText }: { percent: number; color: string; label: string; lightText?: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className="tank" role="img" aria-label={label}>
      <div className="fill" style={{ height: `${pct}%`, background: color }} />
      <div className="pct" style={lightText && pct > 55 ? { color: '#fff' } : undefined}>
        {pct}%
      </div>
    </div>
  )
}

const CHECK = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
)

type Notice = { kind: 'sent' | 'queued' | 'error'; text: string } | null

export function ResidentView() {
  const t = useT()
  const r = t.ref
  const fmt = useFormat()
  const isOnline = useAppStore((s) => s.isOnline)
  const [status, setStatus] = useState<HouseholdStatus | null>(null)
  const [cachedAt, setCachedAt] = useState<string | undefined>()
  const [error, setError] = useState(false)
  const [showSensor, setShowSensor] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  // Reports
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [guess, setGuess] = useState<Classification | null>(null)
  const [picking, setPicking] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Levels
  const [level, setLevel] = useState<LevelChoice | null>(null)
  const [levelNotice, setLevelNotice] = useState<Notice>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.householdStatus(RESIDENT_HOUSEHOLD)
      setStatus(res.data)
      setCachedAt(res.fromCache ? res.cachedAt : undefined)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(load, POLL_MS)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  useEffect(() => {
    QRCode.toDataURL(RESIDENT_HOUSEHOLD, { width: 300, margin: 1, color: { dark: '#0B2A3F', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(null))
  }, [])

  async function sendReport(type: ReportType, note?: string, classifier?: ReportType) {
    setBusy(true)
    try {
      const res = await api.report({ type, household_id: RESIDENT_HOUSEHOLD, note, classifier_category: classifier })
      const what = t.report[type]
      setNotice(res.queued ? { kind: 'queued', text: r.queued(what) } : { kind: 'sent', text: r.sent(what, fmt.time(res.data.timestamp)) })
      setText('')
      setGuess(null)
      setPicking(false)
    } catch {
      setNotice({ kind: 'error', text: r.failed })
    } finally {
      setBusy(false)
    }
  }

  async function classifyText(e: FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    setBusy(true)
    setNotice(null)
    try {
      const c = await api.classify(value)
      if (c.category === 'other' && c.matched.length === 0) setPicking(true)
      else setGuess(c)
    } catch {
      setPicking(true) // offline: the resident picks the type themselves
    } finally {
      setBusy(false)
    }
  }

  async function chooseLevel(l: LevelChoice) {
    setLevel(l)
    try {
      const res = await api.updateLevel(RESIDENT_HOUSEHOLD, l)
      if (res.queued) setLevelNotice({ kind: 'queued', text: r.levelQueued })
      else {
        setStatus(res.data)
        setLevelNotice({ kind: 'sent', text: r.levelSaved })
      }
    } catch {
      setLevelNotice({ kind: 'error', text: r.failed })
    }
  }

  async function advance() {
    const res = await api.advanceDelivery(RESIDENT_HOUSEHOLD)
    if (!res.queued) setStatus(res.data)
  }

  if (showSensor) {
    return (
      <div className="mx-auto max-w-3xl">
        <SensorPage
          householdId={RESIDENT_HOUSEHOLD}
          onBack={() => {
            setShowSensor(false)
            void load()
          }}
        />
      </div>
    )
  }

  if (!status) {
    return (
      <div className="card flex flex-col items-center gap-4 py-12 text-center" role="status">
        {error ? (
          <>
            <TriangleAlert aria-hidden="true" className="h-8 w-8 text-status-nodrink" />
            <p className="font-semibold">{t.loadError}</p>
            <button type="button" onClick={load} className="btn btn-dark">
              <RefreshCw aria-hidden="true" className="h-5 w-5" />
              {t.retry}
            </button>
          </>
        ) : (
          <>
            <LoaderCircle aria-hidden="true" className="h-8 w-8 animate-spin text-teal" />
            <p>{t.loading}</p>
          </>
        )}
      </div>
    )
  }

  const { household: h, forecast: f, sewage: w, measurement: m, delivery: d } = status
  const sensor = m.source === 'sensor'
  const current = d.stage_index
  const delivered = d.stage === 'delivered'
  const etaDay = fmt.day(d.eta)
  const eta = delivered
    ? r.deliveredAt(fmt.time(d.eta))
    : etaDay === t.today
      ? r.etaToday(fmt.time(d.eta))
      : etaDay === t.tomorrow
        ? r.etaTomorrow(fmt.time(d.eta))
        : r.etaDay(etaDay, fmt.time(d.eta))

  return (
    <>
      {(!isOnline || cachedAt) && (
        <div className="mb-5">
          <OfflineBanner cachedAt={cachedAt} />
        </div>
      )}

      <div className="house">
        <div>
          <h2>{r.house(h.id)}</h2>
          <p>{r.houseMeta(h.zone, h.household_size)}</p>
        </div>
      </div>

      <AdvisoryNotice safety={status.safety} />

      <section className="tanks" aria-label={r.tanks}>
        <article className="card tank-card">
          <Tank percent={f.percent} color="var(--water)" label={r.cleanLabel(f.percent)} />
          <div>
            <h3>{r.clean}</h3>
            <div className="big">
              {daysNumber(f.days_left)} <small>{r.daysLeft(f.days_left)}</small>
            </div>
            <div className="meta">{r.litresOf(fmt.number(f.litres_left), fmt.number(f.capacity_l))}</div>
            {sensor ? (
              <>
                <span className="source">
                  <span aria-hidden="true">●</span> {r.sensor(t.tanks.minutesAgo(minutesSince(m.updated_at)))}
                </span>
                <button type="button" className="linkish" onClick={() => setShowSensor(true)}>
                  {r.viewSensor}
                </button>
              </>
            ) : (
              <span className="source est">{r.estimated}</span>
            )}
          </div>
        </article>

        <article className="card tank-card" style={w.is_full ? { borderColor: 'var(--stop)', background: 'var(--stop-soft)' } : undefined}>
          <Tank percent={w.percent} color="var(--waste)" label={r.wasteLabel(w.percent)} lightText />
          <div>
            <h3>{r.waste}</h3>
            {w.is_full ? (
              <>
                <div className="big alert" role="alert">
                  {r.wasteFull}
                </div>
                <div className="meta">{r.wasteFullMeta}</div>
              </>
            ) : (
              <>
                <div className="big">
                  {daysNumber(w.days_until_full)} <small>{r.daysUntilFull(w.days_until_full)}</small>
                </div>
                <div className="meta">{r.wasteMeta(`${fmt.day(w.predicted_full)}, ${fmt.time(w.predicted_full)}`)}</div>
              </>
            )}
            <span className="source est">{r.estimatedWaste}</span>
          </div>
        </article>
      </section>

      <section className="card track" aria-label={r.delivery}>
        <div className="track-head">
          <div>
            <h3>{delivered ? r.deliveredTitle : r.nextDelivery}</h3>
            <div className="eta" aria-live="polite">
              {eta}
            </div>
          </div>
          <p>
            {r.truckMeta(t.driver.truck(d.truck_id), t.tanks.minutesAgo(minutesSince(d.updated_at)))}
            <button type="button" className="linkish" onClick={advance}>
              {r.nextStage}
            </button>
          </p>
        </div>
        <ol className="steps">
          {DELIVERY_STAGES.map((stage, i) => {
            const done = i < current || (delivered && i === current)
            const now = i === current && !delivered
            return (
              <li key={stage} className={done ? 'done' : now ? 'now' : undefined} aria-current={i === current ? 'step' : undefined}>
                <span className="dot">{done && CHECK}</span>
                {r.stages[stage]}
              </li>
            )
          })}
        </ol>
      </section>

      <div className="grid2">
        <section className="card" aria-labelledby="report-title">
          <h3 className="t" id="report-title">
            {r.reportTitle}
          </h3>
          <p className="s">{r.reportSub}</p>
          <div className="options">
            <button type="button" className="opt" disabled={busy} onClick={() => sendReport('clean_water_low')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0E8C99" strokeWidth="2" aria-hidden="true">
                <path d="M12 2.7s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" />
              </svg>
              {r.optLow}
            </button>
            <button type="button" className="opt" disabled={busy} onClick={() => sendReport('sewage_full')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8661E" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3" fill="#A61B1B" stroke="none" />
              </svg>
              {r.optWaste}
            </button>
            <button type="button" className="opt" onClick={() => inputRef.current?.focus()}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A5E6D" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              {r.optOther}
            </button>
          </div>

          <form className="say" onSubmit={classifyText}>
            <label htmlFor="say" className="sr">
              {r.describe}
            </label>
            <input
              id="say"
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setGuess(null)
                setPicking(false)
              }}
              placeholder={r.placeholder}
            />
            <button type="submit" className="btn btn-dark" disabled={busy || !text.trim()}>
              {busy ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" /> : null}
              {r.send}
            </button>
          </form>

          {guess && !picking && (
            <div className="understood" role="status">
              {r.weThink} <b>{t.report[guess.category]}.</b> {r.isRight}
              {guess.matched.length > 0 && <div className="meta">{t.report.because(guess.matched.map((x) => `“${x}”`).join(', '))}</div>}
              <div className="row">
                <button type="button" className="btn btn-dark btn-sm" disabled={busy} onClick={() => sendReport(guess.category, text.trim(), guess.category)}>
                  {r.yes}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setPicking(true)}>
                  {r.change}
                </button>
              </div>
            </div>
          )}

          {picking && (
            <div className="understood" role="group" aria-label={r.pick}>
              <b>{r.pick}</b>
              <div className="row">
                {ALL_TYPES.map((type) => (
                  <button key={type} type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => sendReport(type, text.trim() || undefined, guess?.category)}>
                    {t.report[type]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div aria-live="polite">{notice && <p className={`notice ${notice.kind === 'sent' ? '' : notice.kind}`}>{notice.text}</p>}</div>

          <h3 className="t" style={{ marginTop: 28 }}>
            {r.levelTitle}
          </h3>
          <p className="s">{r.levelSub}</p>
          <div className="levels" role="group" aria-label={r.levelTitle}>
            {LEVELS.map((l) => (
              <button key={l} type="button" aria-pressed={level === l} onClick={() => chooseLevel(l)}>
                {t.level[l]}
              </button>
            ))}
          </div>
          <div aria-live="polite">
            {levelNotice && <p className={`notice ${levelNotice.kind === 'sent' ? '' : levelNotice.kind}`}>{levelNotice.text}</p>}
          </div>
        </section>

        <section className="card qr" aria-labelledby="qr-title">
          <h3 className="t" id="qr-title">
            {r.qrTitle}
          </h3>
          {qr ? <img src={qr} alt={t.qr.alt(h.id)} /> : <div style={{ width: 150, height: 150 }} aria-hidden="true" />}
          <p className="big" style={{ fontSize: 32 }}>
            {h.id}
          </p>
          <p className="s" style={{ margin: 0 }}>
            {r.qrText}
          </p>
        </section>
      </div>
    </>
  )
}
