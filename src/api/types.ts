// Shared types — keep in sync with api/models.py (Pydantic).
// Dates are ISO strings ("YYYY-MM-DD") on the wire.

export type Zone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type VulnerableType = 'elder' | 'infant' | 'medical'

export interface Household {
  id: string // e.g. "A-12"
  zone: Zone
  household_size: number
  tank_capacity_l: number
  current_level_l: number
  last_delivery: string
  vulnerable: boolean // elders, infants, or medical needs
  vulnerable_type: VulnerableType | null
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

export type WaterStatus = 'safe' | 'boil' | 'nodrink'

export interface Advisory {
  zone: Zone
  status: WaterStatus
  since: string
  reason: string
}

// --- Resident status ---------------------------------------------------------

export type LevelChoice = 'full' | 'three_quarters' | 'half' | 'quarter' | 'empty'
export const DELIVERY_STAGES = ['scheduled', 'truck_loaded', 'en_route', 'nearby', 'delivered'] as const
export type DeliveryStage = (typeof DELIVERY_STAGES)[number]

export interface Forecast {
  litres_left: number
  capacity_l: number
  percent: number
  daily_use_l: number
  days_left: number
  predicted_empty: string // ISO datetime
  confidence: 'low' | 'medium' | 'high'
  confidence_note: string
  method: 'household_size' | 'blended'
}

export interface Safety {
  status: WaterStatus
  zone: Zone
  since: string | null
  reason: string | null
}

export interface Delivery {
  stage: DeliveryStage
  stage_index: number
  truck_id: string
  truck_name: string
  eta: string // ISO datetime
  updated_at: string // ISO datetime
}

export interface HouseholdStatus {
  household: Household
  forecast: Forecast
  safety: Safety
  delivery: Delivery
}

export type ReportType = 'water_quality' | 'tank_damage' | 'illness'

export interface ReportIn {
  type: ReportType
  household_id: string
  timestamp?: string
  note?: string
}

export interface Report extends ReportIn {
  id: string
  timestamp: string
  zone: Zone
}

// --- Driver route ------------------------------------------------------------

export type Urgency = 'urgent' | 'soon' | 'ok'

export interface RouteStop {
  rank: number
  household_id: string
  zone: Zone
  vulnerable_type: VulnerableType | null
  advisory: WaterStatus | null
  hours_until_empty: number
  litres_left: number
  litres_to_fill: number
  urgency: Urgency
  priority_score: number
  fits_in_load: boolean
  reason: string // English summary; UI builds a localized one from the fields
}

export interface Completion {
  household_id: string
  zone: Zone
  truck_id: string
  at: string // ISO datetime
}

export interface RouteToday {
  truck: Truck
  generated_at: string
  stops: RouteStop[]
  completed: Completion[]
}
