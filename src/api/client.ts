// Typed API client with offline fallback.
// - Every successful GET is cached in localStorage; if the network fails we
//   return the last cached copy instead.
// - POSTs that can't reach the server are queued in localStorage and sent
//   automatically when the connection comes back.
// `isOnline` lives in the app store.
import { useAppStore } from '../store/useAppStore'
import type {
  ApiResult,
  Health,
  Household,
  HouseholdStatus,
  LevelChoice,
  Report,
  ReportIn,
  Completion,
  RouteToday,
  Advisory,
  AdvisoryIn,
  Dashboard,
  OutbreakAlert,
  Part,
  Partner,
  SealiftPlan,
  AttentionItem,
  Classification,
  SensorReading,
  Service,
  ServiceType, Operations, ReadinessIn, Breakdown, BreakdownIn, RepairIn, WaterCheck, WaterCheckIn, ReviewIn,
} from './types'

// Bump the version when API response shapes change so stale caches are ignored.
const CACHE_PREFIX = 'northlink:cache:v4:'
const QUEUE_KEY = 'northlink:queue'

interface CacheEntry<T> {
  data: T
  cachedAt: string
}

export interface QueuedPost {
  path: string
  body: unknown
  queuedAt: string
}

function readCache<T>(path: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path)
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null
  } catch {
    return null
  }
}

function writeCache<T>(path: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, cachedAt: new Date().toISOString() }
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify(entry))
  } catch {
    // storage full or unavailable — caching is best-effort
  }
}

function readQueue(): QueuedPost[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedPost[]
  } catch {
    return []
  }
}

function writeQueue(q: QueuedPost[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
  } catch {
    /* ignore */
  }
  useAppStore.getState().bumpQueue()
}

/** fetch() that fails like a dropped connection while "Simulate offline" is on. */
function netFetch(input: string, init?: RequestInit): Promise<Response> {
  if (useAppStore.getState().simulateOffline) return Promise.reject(new TypeError('Simulated offline'))
  return fetch(input, init)
}

async function get<T>(path: string): Promise<ApiResult<T>> {
  const { setOnline } = useAppStore.getState()
  try {
    const res = await netFetch(`/api${path}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as T
    writeCache(path, data)
    setOnline(true)
    void flushQueue()
    return { data, fromCache: false }
  } catch (err) {
    setOnline(false)
    const cached = readCache<T>(path)
    if (cached) return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt }
    throw err
  }
}

async function rawPost(path: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return netFetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

/** Staff-only calls carry the demo staff PIN. */
function staffHeaders(): Record<string, string> {
  const pin = useAppStore.getState().staffPin
  return pin ? { 'X-Staff-Pin': pin } : {}
}

/** POST that must reach the server now (no offline queue), e.g. staff actions and classification. */
async function postNow<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await rawPost(path, body, headers)
  useAppStore.getState().setOnline(true)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

/** POST result: either the server's response, or `queued` when offline. */
export type PostResult<T> = { queued: false; data: T } | { queued: true }

async function post<T>(path: string, body: unknown): Promise<PostResult<T>> {
  const { setOnline } = useAppStore.getState()
  let res: Response
  try {
    res = await rawPost(path, body)
  } catch {
    // Network failure: keep it and send later.
    setOnline(false)
    writeQueue([...readQueue(), { path, body, queuedAt: new Date().toISOString() }])
    return { queued: true }
  }
  setOnline(true)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return { queued: false, data: (await res.json()) as T }
}

let flushing = false
/** Replay queued POSTs in order. Returns how many were sent. */
export async function flushQueue(): Promise<number> {
  if (flushing) return 0
  flushing = true
  let sent = 0
  try {
    let q = readQueue()
    while (q.length) {
      // Upgrade legacy queued events before the first attempt; preserve the ID on errors.
      if (q[0].path === '/reports' || /^\/deliveries\/[^/]+\/complete$/.test(q[0].path)) {
        const body = q[0].body as Record<string, unknown>
        if (!body.event_id) {
          q[0].body = { ...body, event_id: crypto.randomUUID() }
          writeQueue(q)
        }
      }
      try {
        const res = await rawPost(q[0].path, q[0].body)
        if (!res.ok) return sent // validation/server errors must remain queued
      } catch {
        return sent // still offline
      }
      useAppStore.getState().setOnline(true)
      // A new item may have been appended while fetch was in flight.
      const delivered = JSON.stringify(q[0])
      q = readQueue()
      const index = q.findIndex(item => JSON.stringify(item) === delivered)
      if (index >= 0) q.splice(index, 1)
      writeQueue(q)
      sent++
    }
    return sent
  } finally {
    flushing = false
  }
}

export function pendingPosts(): QueuedPost[] {
  return readQueue()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushQueue())
}

export const api = {
  health: () => get<Health>('/health'),
  households: () => get<Household[]>('/households'),
  householdStatus: (id: string) => get<HouseholdStatus>(`/households/${encodeURIComponent(id)}/status`),
  updateLevel: (id: string, level: LevelChoice) =>
    post<HouseholdStatus>(`/households/${encodeURIComponent(id)}/level`, { level }),
  // Timestamp is set here so a report queued offline keeps its real time.
  report: (r: ReportIn) => post<Report>('/reports', { timestamp: new Date().toISOString(), ...r, event_id: r.event_id ?? crypto.randomUUID() }),
  routeToday: (truck: string) => get<RouteToday>(`/route/today?truck=${encodeURIComponent(truck)}`),
  // Timestamp is when the driver filled the tank, even if it syncs later.
  completeDelivery: (id: string, truckId: string, service: Service = 'water', serviceType?: ServiceType, runId?: string) =>
    post<Completion>(`/deliveries/${encodeURIComponent(id)}/complete`, {
      event_id: crypto.randomUUID(),
      truck_id: truckId,
      service,
      service_type: serviceType,
      run_id: runId,
      timestamp: new Date().toISOString(),
    }),
  dashboard: () => get<Dashboard>('/dashboard'),
  operations: () => get<Operations>('/operations'),
  readiness: (body: ReadinessIn) => postNow<Operations>('/operations/readiness', body, staffHeaders()),
  breakdowns: () => get<Breakdown[]>('/breakdowns'),
  createBreakdown: (body: BreakdownIn) => postNow<Breakdown>('/breakdowns', body, staffHeaders()),
  repair: (id: string, body: RepairIn) => postNow<Breakdown>(`/breakdowns/${encodeURIComponent(id)}/repair`, body, staffHeaders()),
  updateStock: (id: string, on_hand: number) => postNow<Part>(`/parts/${encodeURIComponent(id)}/stock`, { on_hand }, staffHeaders()),
  waterChecks: () => get<WaterCheck[]>('/water-checks'),
  createWaterCheck: (body: WaterCheckIn) => postNow<WaterCheck>('/water-checks', body, staffHeaders()),
  reviewWaterCheck: (id: string, body: ReviewIn) => postNow<WaterCheck>(`/water-checks/${encodeURIComponent(id)}/review`, body, staffHeaders()),
  outbreaks: () => get<OutbreakAlert[]>('/outbreaks'),
  advisories: () => get<Advisory[]>('/advisories'),
  issueAdvisory: (a: AdvisoryIn) => postNow<Advisory>('/advisories', a, staffHeaders()),
  liftAdvisory: async (zone: string) => {
    const res = await netFetch(`/api/advisories/${encodeURIComponent(zone)}`, { method: 'DELETE', headers: staffHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  },
  attention: () => get<AttentionItem[]>('/attention'),
  sensor: (id: string) => get<SensorReading>(`/households/${encodeURIComponent(id)}/sensor`),
  simulateUsage: (id: string, litres = 25) =>
    postNow<SensorReading>(`/households/${encodeURIComponent(id)}/sensor/simulate-usage`, { litres }),
  classify: (text: string) => postNow<Classification>('/reports/classify', { text }),
  demoReset: async () => {
    const res = await netFetch('/api/demo/reset', { method: 'POST' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  },
  parts: () => get<Part[]>('/parts'),
  sealiftPlan: () => get<SealiftPlan>('/parts/sealift-plan'),
  partners: () => get<Partner[]>('/partners'),
  advanceDelivery: (id: string) => post<HouseholdStatus>(`/deliveries/${encodeURIComponent(id)}/advance`, {}),
}
