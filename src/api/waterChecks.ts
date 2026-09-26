// Source and drop-point water quality checks (#8). Types mirror api/water_checks.py.
import { useAppStore } from '../store/useAppStore'

export type Checkpoint = 'source' | 'drop_point'
export type ReviewStatus = 'unreviewed' | 'reviewed' | 'needs_follow_up'

export interface WaterCheck {
  id: string
  checkpoint: Checkpoint
  run_id: string
  truck_id: string
  household_id: string | null
  sampled_at: string
  collector: string
  parameter: string
  value: number | null
  units: string | null
  method: string | null
  note: string | null
  review_status: ReviewStatus
}

export interface DropPoint {
  household_id: string
  checks: WaterCheck[]
  missing: boolean
}

export interface RunSummary {
  run_id: string
  truck_id: string
  date: string
  source: WaterCheck[]
  drop_points: DropPoint[]
  missing_source: boolean
  missing_drop_points: string[]
  unreviewed: number
  needs_review: boolean
}

export interface WaterChecksResponse {
  runs: RunSummary[]
  thresholds_note: string
}

export interface WaterCheckIn {
  checkpoint: Checkpoint
  run_id: string
  household_id?: string
  collector: string
  parameter: string
  value?: number
  units?: string
  method?: string
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

export const waterChecksApi = {
  list: () => fetch('/api/water-checks').then((r) => json<WaterChecksResponse>(r)),
  log: (c: WaterCheckIn) =>
    fetch('/api/water-checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c),
    }).then((r) => json<WaterCheck>(r)),
  /** Staff only: sends the demo staff PIN. */
  review: (id: string, status: ReviewStatus) =>
    fetch(`/api/water-checks/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Staff-Pin': useAppStore.getState().staffPin ?? '' },
      body: JSON.stringify({ status }),
    }).then((r) => json<WaterCheck>(r)),
}
