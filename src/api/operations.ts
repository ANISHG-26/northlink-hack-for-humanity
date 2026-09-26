// Truck operations: open requests, service history, response time, and coverage (#2).
//
// Reads GET /api/operations (the #3 backend, api/operations_api.py) and adapts
// it to the shape these screens use. If that endpoint is unreachable, the UI
// falls back to the SAMPLE response below and merges in real completions from
// the route endpoint, so a driver's completion still shows after refresh.
import { api, pendingPosts } from './client'
import type { Completion, Zone } from './types'

export type RequestService = 'water' | 'sewage_full' | 'sewage_blocked'
export type VisitService = 'water' | 'sewage'

export interface ServiceRequest {
  id: string
  household_id: string
  zone: Zone
  service: RequestService
  source: 'resident' | 'sensor' | 'staff' | 'driver' | 'dispatcher' | 'sample'
  reported_at: string
  status: 'open' | 'completed'
}

export interface CompletedRequest {
  id: string
  request_id: string | null
  household_id: string
  service: VisitService
  truck_id: string
  reported_at: string | null
  completed_at: string
  /** Only for completions linked to a request (completed_at − reported_at). */
  response_minutes: number | null
}

export interface ServiceHistory {
  household_id: string
  service: VisitService
  last_visit: string
  visit_count: number
}

export interface Coverage {
  drivers_available: number
  drivers_standby: number
  drivers_absent: number
  drivers_needed: number
  trucks_in_service: number
  trucks_total: number
  /** Team assumption: one water truck covers up to this many households. Coverage, not daily throughput. */
  households_per_truck: number
  water_households_total: number
  /** Households the in-service water trucks can cover, when the API computes it. */
  water_households_covered?: number
  shortfall: boolean
  /** Plain-language coverage assumption from the API, when provided. */
  assumption?: string
}

export interface OperationsResponse {
  generated_at: string
  open_requests: ServiceRequest[]
  completed: CompletedRequest[]
  history: ServiceHistory[]
  coverage: Coverage
}

/** Operations data plus where it came from and any offline completions not yet synced. */
export interface OperationsView extends OperationsResponse {
  source: 'api' | 'sample'
  pending: { household_id: string; service: VisitService; at: string }[]
}

const TRUCKS = ['T1', 'T2', 'T3']

export function visitServiceOf(s: RequestService): VisitService {
  return s === 'water' ? 'water' : 'sewage'
}

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

/** SAMPLE operations response (sample data, for the demo only). */
export function sampleOperations(): OperationsResponse {
  return {
    generated_at: new Date().toISOString(),
    open_requests: [
      { id: 'SR-101', household_id: 'C-12', zone: 'C', service: 'sewage_full', source: 'resident', reported_at: ago(55), status: 'open' },
      { id: 'SR-102', household_id: 'D-08', zone: 'D', service: 'sewage_full', source: 'sensor', reported_at: ago(190), status: 'open' },
      { id: 'SR-103', household_id: 'A-02', zone: 'A', service: 'water', source: 'resident', reported_at: ago(125), status: 'open' },
      { id: 'SR-104', household_id: 'E-11', zone: 'E', service: 'sewage_blocked', source: 'resident', reported_at: ago(40), status: 'open' },
      { id: 'SR-105', household_id: 'C-05', zone: 'C', service: 'water', source: 'staff', reported_at: ago(20), status: 'open' },
    ],
    completed: [
      { id: 'EV-201', request_id: 'SR-090', household_id: 'A-07', service: 'water', truck_id: 'T1', reported_at: ago(26 * 60), completed_at: ago(21 * 60), response_minutes: 300 },
      { id: 'EV-202', request_id: 'SR-088', household_id: 'B-13', service: 'sewage', truck_id: 'T1', reported_at: ago(52 * 60), completed_at: ago(30 * 60), response_minutes: 1320 },
      { id: 'EV-203', request_id: null, household_id: 'D-22', service: 'water', truck_id: 'T2', reported_at: null, completed_at: ago(6 * 60), response_minutes: null },
    ],
    history: [
      { household_id: 'C-12', service: 'water', last_visit: ago(2 * 24 * 60), visit_count: 6 },
      { household_id: 'C-12', service: 'sewage', last_visit: ago(5 * 24 * 60), visit_count: 2 },
      { household_id: 'A-07', service: 'water', last_visit: ago(21 * 60), visit_count: 7 },
      { household_id: 'B-13', service: 'sewage', last_visit: ago(30 * 60), visit_count: 3 },
      { household_id: 'D-22', service: 'water', last_visit: ago(6 * 60), visit_count: 5 },
      { household_id: 'D-08', service: 'sewage', last_visit: ago(6 * 24 * 60), visit_count: 2 },
    ],
    coverage: {
      drivers_available: 2,
      drivers_standby: 1,
      drivers_absent: 1,
      drivers_needed: 3,
      trucks_in_service: 2,
      trucks_total: 3,
      households_per_truck: 500,
      water_households_total: 1500,
      shortfall: true,
    },
  }
}

/** Fold real completions (from the route endpoint) into the operations data. */
export function mergeCompletions(ops: OperationsResponse, completions: Completion[]): OperationsResponse {
  const open = [...ops.open_requests]
  const completed = [...ops.completed]
  const history = ops.history.map((h) => ({ ...h }))
  const seen = new Set(completed.map((c) => `${c.household_id}:${c.service}:${c.completed_at.slice(0, 10)}`))

  for (const c of completions) {
    const key = `${c.household_id}:${c.service}:${c.at.slice(0, 10)}`
    if (seen.has(key)) continue // same visit replayed: count it once
    seen.add(key)
    const idx = open.findIndex((r) => r.household_id === c.household_id && visitServiceOf(r.service) === c.service)
    const req = idx >= 0 ? open.splice(idx, 1)[0] : null
    const response = req ? Math.max(0, Math.round((new Date(c.at).getTime() - new Date(req.reported_at).getTime()) / 60_000)) : null
    completed.unshift({
      id: `EV-${c.household_id}-${c.service}-${c.at}`,
      request_id: req?.id ?? null,
      household_id: c.household_id,
      service: c.service,
      truck_id: c.truck_id,
      reported_at: req?.reported_at ?? null,
      completed_at: c.at,
      response_minutes: response,
    })
    const h = history.find((x) => x.household_id === c.household_id && x.service === c.service)
    if (h) {
      h.visit_count += 1
      if (c.at > h.last_visit) h.last_visit = c.at
    } else {
      history.push({ household_id: c.household_id, service: c.service, last_visit: c.at, visit_count: 1 })
    }
  }
  return { ...ops, open_requests: open, completed, history }
}

/** Offline completions still waiting in this device's queue: shown as pending, never as completed. */
export function pendingCompletions(): OperationsView['pending'] {
  return pendingPosts().flatMap((p) => {
    const m = p.path.match(/^\/deliveries\/([^/]+)\/complete$/)
    if (!m) return []
    const body = p.body as { service?: VisitService; timestamp?: string }
    return [{ household_id: decodeURIComponent(m[1]), service: body.service ?? 'water', at: body.timestamp ?? p.queuedAt }]
  })
}

/** Median of completed-request response times for one service; null when there are none. */
export function medianResponse(completed: CompletedRequest[], service: VisitService): number | null {
  const xs = completed
    .filter((c) => c.service === service && c.response_minutes !== null)
    .map((c) => c.response_minutes as number)
    .sort((a, b) => a - b)
  if (!xs.length) return null
  const mid = Math.floor(xs.length / 2)
  return xs.length % 2 ? xs[mid] : Math.round((xs[mid - 1] + xs[mid]) / 2)
}

// --- #3 API response (api/models.py: Operations) -------------------------------------

type ApiServiceType = RequestService

interface ApiServiceRequest {
  id: string
  household_id: string
  service_type: ApiServiceType
  source: ServiceRequest['source']
  reported_at: string
  completion_event_id: string | null
  completed_at: string | null
  response_seconds: number | null
}

interface ApiServiceCoverage {
  service: VisitService
  drivers_available: number
  drivers_standby: number
  trucks_in_service: number
  crews_available: number
  crews_needed: number
  shortfall: number
  households_per_truck: number | null
  household_coverage: number | null
  uncovered_households: number | null
}

export interface ApiOperations {
  storage: 'sample' | 'postgres'
  open_requests: ApiServiceRequest[]
  completed_requests: ApiServiceRequest[]
  visits: { household_id: string; service_type: ApiServiceType; last_visit: string | null; visit_count: number }[]
  completions: { event_id: string; household_id: string; zone: Zone; truck_id: string; service_type: ApiServiceType; completed_at: string }[]
  drivers: { id: string; service: VisitService; status: 'available' | 'standby' | 'absent' }[]
  trucks: { id: string }[]
  coverage: {
    drivers_available: number
    drivers_standby: number
    trucks_in_service: number
    shortfall: boolean
    water: ApiServiceCoverage
    sanitation: ApiServiceCoverage
    assumption: string
  }
}

/** Adapt the #3 operations response to the shape these screens use. */
export function fromApi(api: ApiOperations): OperationsResponse {
  const byEvent = new Map(api.completed_requests.filter((r) => r.completion_event_id).map((r) => [r.completion_event_id as string, r]))
  const water = api.coverage.water
  const covered = water.household_coverage ?? undefined
  return {
    generated_at: new Date().toISOString(),
    open_requests: api.open_requests.map((r) => ({
      id: r.id,
      household_id: r.household_id,
      zone: r.household_id.charAt(0) as Zone,
      service: r.service_type,
      source: r.source,
      reported_at: r.reported_at,
      status: 'open',
    })),
    completed: [...api.completions]
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at))
      .map((c) => {
        const req = byEvent.get(c.event_id)
        return {
          id: c.event_id,
          request_id: req?.id ?? null,
          household_id: c.household_id,
          service: visitServiceOf(c.service_type),
          truck_id: c.truck_id,
          reported_at: req?.reported_at ?? null,
          completed_at: c.completed_at,
          response_minutes: req?.response_seconds != null ? Math.round(req.response_seconds / 60) : null,
        }
      }),
    history: api.visits
      .filter((v) => v.visit_count > 0 && v.last_visit)
      .map((v) => ({ household_id: v.household_id, service: visitServiceOf(v.service_type), last_visit: v.last_visit as string, visit_count: v.visit_count })),
    coverage: {
      drivers_available: api.coverage.drivers_available,
      drivers_standby: api.coverage.drivers_standby,
      drivers_absent: api.drivers.filter((d) => d.status === 'absent').length,
      drivers_needed: water.crews_needed + api.coverage.sanitation.crews_needed,
      trucks_in_service: api.coverage.trucks_in_service,
      trucks_total: api.trucks.length,
      households_per_truck: water.households_per_truck ?? 500,
      water_households_total: (water.household_coverage ?? 0) + (water.uncovered_households ?? 0),
      water_households_covered: covered,
      shortfall: api.coverage.shortfall,
      assumption: api.coverage.assumption,
    },
  }
}

export async function loadOperations(): Promise<OperationsView> {
  const pending = pendingCompletions()
  // Prefer the real #3 endpoint.
  try {
    const res = await fetch('/api/operations', { headers: { Accept: 'application/json' } })
    if (res.ok) return { ...fromApi((await res.json()) as ApiOperations), source: 'api', pending }
  } catch {
    /* fall through to sample data */
  }
  const routes = await Promise.allSettled(TRUCKS.map((t) => api.routeToday(t)))
  const completions = routes.flatMap((r) => (r.status === 'fulfilled' ? r.value.data.completed : []))
  return { ...mergeCompletions(sampleOperations(), completions), source: 'sample', pending }
}
