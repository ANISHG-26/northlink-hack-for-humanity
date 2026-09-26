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
} from './types'

const CACHE_PREFIX = 'northlink:cache:'
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

async function rawPost(path: string, body: unknown): Promise<Response> {
  return netFetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
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
      try {
        await rawPost(q[0].path, q[0].body)
      } catch {
        return sent // still offline
      }
      useAppStore.getState().setOnline(true)
      q = q.slice(1)
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
  report: (r: ReportIn) => post<Report>('/reports', { timestamp: new Date().toISOString(), ...r }),
  routeToday: (truck: string) => get<RouteToday>(`/route/today?truck=${encodeURIComponent(truck)}`),
  // Timestamp is when the driver filled the tank, even if it syncs later.
  completeDelivery: (id: string, truckId: string) =>
    post<Completion>(`/deliveries/${encodeURIComponent(id)}/complete`, {
      truck_id: truckId,
      timestamp: new Date().toISOString(),
    }),
  dashboard: () => get<Dashboard>('/dashboard'),
  outbreaks: () => get<OutbreakAlert[]>('/outbreaks'),
  advisories: () => get<Advisory[]>('/advisories'),
  issueAdvisory: (a: AdvisoryIn) => post<Advisory>('/advisories', a),
  liftAdvisory: async (zone: string) => {
    const res = await fetch(`/api/advisories/${encodeURIComponent(zone)}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  },
  parts: () => get<Part[]>('/parts'),
  sealiftPlan: () => get<SealiftPlan>('/parts/sealift-plan'),
  partners: () => get<Partner[]>('/partners'),
  advanceDelivery: (id: string) => post<HouseholdStatus>(`/deliveries/${encodeURIComponent(id)}/advance`, {}),
}
