// Shared types — keep in sync with api/models.py (Pydantic).
// Dates are ISO strings ("YYYY-MM-DD") on the wire.

export type Zone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface Household {
  id: string // e.g. "A-12"
  zone: Zone
  household_size: number
  tank_capacity_l: number
  current_level_l: number
  last_delivery: string
  vulnerable: boolean // elders, infants, or medical needs
  last_truck_id: string
}

export interface Truck {
  id: string
  name: string
  capacity_l: number
  status: 'in_service' | 'maintenance' | 'out_of_service'
  zones: Zone[]
  last_disinfection: string
}

export interface IllnessReport {
  id: string
  household_id: string
  zone: Zone
  reported: string
  symptoms: string[]
  people_affected: number
  truck_id: string
}

export interface Part {
  id: string
  name: string
  category: 'treatment' | 'truck' | 'household'
  on_hand: number
  min_stock: number
  monthly_use: number
  lead_time_days: number
  next_sealift: string
}

export interface Health {
  status: 'ok'
  version: string
}

/** Every client call returns data plus where it came from. */
export interface ApiResult<T> {
  data: T
  fromCache: boolean
  cachedAt?: string
}
