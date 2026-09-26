import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  CircleCheckBig,
  CloudUpload,
  LoaderCircle,
  PartyPopper,
  RefreshCw,
  ScanLine,
  TriangleAlert,
  Siren,
  Truck,
  Droplet,
  WifiOff,
  X,
} from 'lucide-react'
import { api, flushQueue, pendingPosts } from '../api/client'
import type { Household, RouteToday, Service } from '../api/types'
import { OfflineBanner } from '../components/OfflineBanner'
import { QrScanner } from '../components/driver/QrScanner'
import { RouteStopCard } from '../components/driver/RouteStopCard'
import { useT } from '../i18n'
import { useFormat } from '../i18n/format'
import { useAppStore } from '../store/useAppStore'

const TRUCKS = ['T1', 'T2', 'T3']
const COMPLETE_PATH = /^\/deliveries\/([^/]+)\/complete$/

/** "c12", "C 12", "c-12" → "C-12"; null if it doesn't look like a house code. */
export function normalizeHouseCode(raw: string): string | null {
  const m = raw.trim().toUpperCase().match(/^([A-F])\s*-?\s*(\d{1,2})$/)
  return m ? `${m[1]}-${m[2].padStart(2, '0')}` : null
}

type Message =
  | { kind: 'delivered'; code: string; at: string }
  | { kind: 'queued'; code: string }
  | { kind: 'synced'; n: number }
  | { kind: 'error'; text: string }

export function DriverView() {
  const t = useT()
  const fmt = useFormat()
  const isOnline = useAppStore((s) => s.isOnline)
  const simulateOffline = useAppStore((s) => s.simulateOffline)
  const setSimulateOffline = useAppStore((s) => s.setSimulateOffline)
  const queueVersion = useAppStore((s) => s.queueVersion)

  const [truckId, setTruckId] = useState('T2')
  const [service, setService] = useState<Service>('water')
  const [route, setRoute] = useState<RouteToday | null>(null)
  const [cachedAt, setCachedAt] = useState<string | undefined>()
  const [loadError, setLoadError] = useState(false)
  const [households, setHouseholds] = useState<Household[]>([])
  const [scanning, setScanning] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const messageRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await api.routeToday(truckId)
      setRoute(r.data)
      setCachedAt(r.fromCache ? r.cachedAt : undefined)
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [truckId])

  useEffect(() => {
    setRoute(null)
    void load()
  }, [load])

  useEffect(() => {
    api
      .households()
      .then((r) => setHouseholds(r.data))
      .catch(() => {})
  }, [])

  // Deliveries saved offline, waiting in the queue (re-read whenever the queue changes).
  const pending = useMemo(() => {
    void queueVersion
    return pendingPosts().flatMap((p) => {
      const m = p.path.match(COMPLETE_PATH)
      if (!m) return []
      const body = p.body as { timestamp?: string; truck_id?: string; service?: Service }
      return [{ household_id: decodeURIComponent(m[1]), service: body.service ?? 'water', at: body.timestamp ?? p.queuedAt }]
    })
  }, [queueVersion])

  // When queued deliveries sync, say so and refresh the route.
  const prevPending = useRef(pending.length)
  useEffect(() => {
    const synced = prevPending.current - pending.length
    prevPending.current = pending.length
    if (synced > 0) {
      setMessage({ kind: 'synced', n: synced })
      void load()
    }
  }, [pending.length, load])

  const pendingKeys = new Set(pending.map((p) => `${p.household_id}:${p.service}`))
  const stops = route?.stops.filter((s) => !pendingKeys.has(`${s.household_id}:${s.service}`)) ?? []
  const completed = route?.completed.filter((c) => !pendingKeys.has(`${c.household_id}:${c.service}`)) ?? []

  async function complete(raw: string) {
    const normalized = normalizeHouseCode(raw)
    if (!normalized) {
      setMessage({ kind: 'error', text: t.driver.codeInvalid })
      return
    }
    if (households.length && !households.some((h) => h.id === normalized)) {
      setMessage({ kind: 'error', text: t.driver.codeUnknown(normalized) })
      return
    }
    setBusy(true)
    try {
      const res = await api.completeDelivery(normalized, truckId, service)
      if (res.queued) {
        setMessage({ kind: 'queued', code: normalized })
      } else {
        setMessage({ kind: 'delivered', code: normalized, at: res.data.at })
        void load()
      }
      setCode('')
    } catch {
      setMessage({ kind: 'error', text: t.driver.codeUnknown(normalized) })
    } finally {
      setBusy(false)
      messageRef.current?.focus()
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void complete(code)
  }

  function onScan(text: string) {
    setScanning(false)
    void complete(text)
  }

  function toggleOffline() {
    const next = !simulateOffline
    setSimulateOffline(next)
    if (!next) void flushQueue().then(() => load())
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      {/* Demo controls + truck */}
      <section className="card flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label={t.driver.truckPicker} className="flex flex-wrap gap-2">
            {TRUCKS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={truckId === id}
                onClick={() => setTruckId(id)}
                className={`tap inline-flex items-center gap-2 rounded-xl border-2 px-3 font-semibold ${
                  truckId === id ? 'border-navy bg-navy text-white' : 'border-slate-200 text-navy hover:bg-slate-50'
                }`}
              >
                <Truck aria-hidden="true" className="h-5 w-5" />
                {t.driver.truck(id)}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={simulateOffline}
            onClick={toggleOffline}
            className={`tap inline-flex items-center gap-3 rounded-xl border-2 px-3 font-semibold ${
              simulateOffline ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            title={t.driver.simulateHelp}
          >
            <span
              aria-hidden="true"
              className={`relative h-6 w-11 rounded-full transition-colors ${simulateOffline ? 'bg-white/30' : 'bg-slate-300'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  simulateOffline ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </span>
            <WifiOff aria-hidden="true" className="h-5 w-5" />
            {t.driver.simulateOffline}
          </button>
        </div>

        {/* Job type */}
        <fieldset>
          <legend className="font-semibold text-navy">{t.driver.serviceLabel}</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(['water', 'sewage'] as const).map((sv) => {
              const Icon = sv === 'water' ? Droplet : Siren
              return (
                <label key={sv} className="cursor-pointer">
                  <input type="radio" name="service" value={sv} checked={service === sv} onChange={() => setService(sv)} className="peer sr-only" />
                  <span className="tap flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-3 font-semibold text-navy peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-glacier">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                    {t.driver.service[sv]}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* Scan / enter code */}
        <div>
          <button
            type="button"
            onClick={() => setScanning((s) => !s)}
            className={`w-full min-h-[4rem] inline-flex items-center justify-center gap-3 rounded-xl px-5 text-xl font-bold ${
              scanning ? 'border-2 border-slate-300 text-navy hover:bg-slate-50' : 'bg-teal text-white hover:bg-glacier'
            }`}
          >
            {scanning ? <X aria-hidden="true" className="h-7 w-7" /> : <ScanLine aria-hidden="true" className="h-7 w-7" />}
            {scanning ? t.driver.stopScan : t.driver.scan}
          </button>
          {scanning && <QrScanner onScan={onScan} />}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <label htmlFor="house-code" className="font-semibold text-navy">
            {t.driver.orEnter}
          </label>
          <div className="flex gap-2">
            <input
              id="house-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t.driver.codePlaceholder}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="tap min-w-0 flex-1 rounded-xl border-2 border-slate-300 px-4 text-xl font-bold tracking-wider uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:border-glacier"
            />
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="tap inline-flex items-center gap-2 rounded-xl bg-navy px-4 font-bold text-white hover:bg-glacier disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
              ) : (
                <CircleCheckBig aria-hidden="true" className="h-5 w-5" />
              )}
              {t.driver.complete}
            </button>
          </div>
        </form>

        <div ref={messageRef} tabIndex={-1} aria-live="polite" className="outline-none">
          {message?.kind === 'delivered' && (
            <p className="flex items-center gap-2 rounded-xl bg-green-50 border-2 border-status-safe p-3 font-semibold text-status-safe">
              <CircleCheckBig aria-hidden="true" className="h-6 w-6 shrink-0" />
              {t.driver.deliveredTo(message.code, fmt.time(message.at))}
            </p>
          )}
          {message?.kind === 'queued' && (
            <p className="flex items-center gap-2 rounded-xl bg-glacier/10 border-2 border-glacier p-3 font-semibold text-glacier">
              <CloudUpload aria-hidden="true" className="h-6 w-6 shrink-0" />
              {message.code}: {t.driver.savedOffline}
            </p>
          )}
          {message?.kind === 'synced' && (
            <p className="flex items-center gap-2 rounded-xl bg-green-50 border-2 border-status-safe p-3 font-semibold text-status-safe">
              <RefreshCw aria-hidden="true" className="h-6 w-6 shrink-0" />
              {t.driver.synced(message.n)}
            </p>
          )}
          {message?.kind === 'error' && (
            <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 border-2 border-status-nodrink p-3 font-semibold text-status-nodrink">
              <TriangleAlert aria-hidden="true" className="h-6 w-6 shrink-0" />
              {message.text}
            </p>
          )}
        </div>
      </section>

      {(!isOnline || cachedAt) && <OfflineBanner cachedAt={cachedAt} />}

      {/* Today's route */}
      <section aria-labelledby="route-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 id="route-heading" className="text-2xl font-bold text-navy">
            {t.driver.title}
          </h2>
          {route && (
            <p className="text-slate-600">
              {t.driver.truck(route.truck.id)} · {t.driver.zones(route.truck.zones.join(', '))} · {t.driver.stops(stops.length)}
            </p>
          )}
        </div>
        {!route ? (
          <div className="card flex items-center justify-center gap-3 py-10" role="status">
            {loadError ? (
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
        ) : stops.length === 0 ? (
          <p className="card flex items-center gap-3 text-lg font-semibold text-status-safe">
            <PartyPopper aria-hidden="true" className="h-6 w-6" />
            {t.driver.allDone}
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {stops.map((s) => (
              <RouteStopCard key={`${s.household_id}-${s.service}`} stop={s} />
            ))}
          </ol>
        )}
      </section>

      {/* Completed */}
      <section aria-labelledby="completed-heading">
        <h2 id="completed-heading" className="text-2xl font-bold text-navy mb-3">
          {t.driver.completedTitle}
        </h2>
        {pending.length === 0 && completed.length === 0 ? (
          <p className="card text-slate-600">{t.driver.noneCompleted}</p>
        ) : (
          <ul className="card !p-0 divide-y divide-slate-100">
            {pending.map((p) => (
              <li key={`p-${p.household_id}-${p.service}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="text-xl font-bold text-navy">{p.household_id}</span>
                  <span className="ml-2 text-slate-600">{t.driver.service[p.service]}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-glacier/10 px-3 py-1 font-semibold text-glacier">
                  <CloudUpload aria-hidden="true" className="h-5 w-5" />
                  {t.driver.waitingSync} · {fmt.time(p.at)}
                </span>
              </li>
            ))}
            {completed.map((c) => (
              <li key={`${c.household_id}-${c.service}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="text-xl font-bold text-navy">{c.household_id}</span>
                  <span className="ml-2 text-slate-600">{t.driver.service[c.service]}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 font-semibold text-status-safe">
                  <CircleCheckBig aria-hidden="true" className="h-5 w-5" />
                  {t.delivery.delivered(fmt.time(c.at))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
