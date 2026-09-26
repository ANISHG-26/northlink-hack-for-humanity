// Truck breakdowns and repair parts (#7). Types mirror api/breakdowns.py.
export type Cause = 'unknown' | 'wear' | 'freezing' | 'damage' | 'electrical' | 'other'
export type RepairStatus = 'open' | 'waiting_parts' | 'in_repair' | 'fixed'

export interface Breakdown {
  id: string
  truck_id: string
  truck_name: string
  part_id: string | null
  part_name: string | null
  symptom: string
  cause: Cause
  cause_confirmed: boolean
  status: RepairStatus
  opened_at: string
  fixed_at: string | null
  downtime_minutes: number | null
  stock_on_hand: number | null
  reorder_needed: boolean | null
}

export interface TruckStatus {
  id: string
  name: string
  status: 'in_service' | 'maintenance' | 'out_of_service'
}

export interface BreakdownsResponse {
  breakdowns: Breakdown[]
  trucks: TruckStatus[]
  trucks_in_service: number
  trucks_total: number
}

export interface BreakdownIn {
  truck_id: string
  part_id?: string
  symptom: string
  cause: Cause
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }

export const breakdownsApi = {
  list: () => fetch('/api/breakdowns').then((r) => json<BreakdownsResponse>(r)),
  report: (b: BreakdownIn) =>
    fetch('/api/breakdowns', { method: 'POST', headers, body: JSON.stringify(b) }).then((r) => json<Breakdown>(r)),
  setStatus: (id: string, status: RepairStatus) =>
    fetch(`/api/breakdowns/${encodeURIComponent(id)}/status`, { method: 'POST', headers, body: JSON.stringify({ status }) }).then((r) =>
      json<Breakdown>(r),
    ),
}
