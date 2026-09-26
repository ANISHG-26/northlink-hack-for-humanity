// Shared types — keep in sync with api/models.py (Pydantic).
// Dates are ISO strings ("YYYY-MM-DD") on the wire.

export type Zone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type VulnerableType = 'elder' | 'infant' | 'medical'
export type MeasurementSource = 'sensor' | 'estimated'
export type Service = 'water' | 'sewage'
export type ServiceType = 'water' | 'sewage_full' | 'sewage_blocked'

export interface CompleteIn {
  event_id?: string
  truck_id?: string | null
  timestamp?: string | null
  service?: Service
  service_type?: ServiceType | null
  run_id?: string | null
}
export interface Driver {
  id: string
  name: string
  service: Service
  status: 'available' | 'standby' | 'absent'
}
export interface ReadinessIn {
  drivers?: Record<string, Driver['status']>
  trucks?: Record<string, Truck['status']>
}
export interface ServiceRequest {
  id: string
  household_id: string
  service_type: ServiceType
  source: 'resident' | 'driver' | 'dispatcher' | 'sample'
  reported_at: string
  completion_event_id: string | null
  completed_at: string | null
  response_seconds: number | null
}
export interface VisitSummary {
  household_id: string
  service_type: ServiceType
  last_visit: string | null
  visit_count: number
}
export interface ServiceCoverage {
  service: Service
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
export interface Coverage {
  drivers_available: number
  drivers_standby: number
  trucks_in_service: number
  shortfall: boolean
  water: ServiceCoverage
  sanitation: ServiceCoverage
  assumption: string
}
export interface Operations {
  storage: 'sample' | 'postgres'
  open_requests: ServiceRequest[]
  completed_requests: ServiceRequest[]
  visits: VisitSummary[]
  completions: Completion[]
  drivers: Driver[]
  trucks: Truck[]
  coverage: Coverage
}
export interface BreakdownIn {
  event_id?: string
  truck_id: string
  part_id: string
  symptom: string
  cause_category?: 'unknown' | 'wear' | 'freeze' | 'electrical' | 'other'
  cause_confirmed?: boolean
  opened_at: string
}
export interface Breakdown extends BreakdownIn {
  event_id: string
  cause_category: NonNullable<BreakdownIn['cause_category']>
  cause_confirmed: boolean
  status: 'open' | 'repairing' | 'fixed'
  fixed_at: string | null
  stock_quantity: number
  parts_used: number
  restoration_seconds: number | null
}
export interface RepairIn {
  status: 'repairing' | 'fixed'
  fixed_at?: string | null
  parts_used?: number
}
export interface StockIn { on_hand: number }
export interface WaterCheckIn {
  event_id?: string
  checkpoint: 'source' | 'drop_point'
  truck_id: string
  run_id: string
  household_id?: string | null
  sampled_at: string
  collector: string
  parameter: string
  value: number
  units: string
  method?: string | null
}
export interface WaterCheck extends WaterCheckIn {
  event_id: string
  household_id: string | null
  method: string | null
  review_status: 'unreviewed' | 'reviewed' | 'follow_up'
  reviewed_by: string | null
  reviewed_at: string | null
  sample_data: true
}
export interface ReviewIn {
  review_status: 'reviewed' | 'follow_up'
  reviewed_by: string
}
export interface CheckpointPair {
  household_id: string
  source: WaterCheck[]
  drop_point: WaterCheck[]
  flags: ('missing_source' | 'missing_drop_point' | 'unreviewed' | 'follow_up')[]
}
export type AdvisorySource = 'Municipal water office' | 'Regional health board'

export interface Household {
  id: string // e.g. "A-12"
  zone: Zone
  household_size: number
  tank_capacity_l: number
  current_level_l: number
  last_delivery: string
  last_delivery_litres: number
  vulnerable: boolean // elders, infants, or medical needs
  vulnerable_type: VulnerableType | null
  last_truck_id: string
  measurement_source: MeasurementSource
  empty_tank_weight_kg: number | null
  sewage_capacity_l: number
  sewage_level_l: number
  last_sewage_pickup: string | null
}

export interface Truck {
  service: Service
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

export type PartCategory = 'treatment' | 'truck' | 'household'

export interface Part {
  id: string
  name: string
  category: PartCategory
  unit: string
  on_hand: number
  monthly_use: number
}

export interface Partner {
  verification_status: 'unverified'
  id: string
  type: 'health' | 'provincial' | 'federal' | 'supplier'
  name: string
  helps_with: string[]
  request_template: 'water_testing' | 'general' | 'parts'
}

export interface Health {
  storage: 'sample' | 'postgres'
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
  status: WaterStatus // 'boil' | 'nodrink' when active
  since: string
  reason: string
  message: string | null
  issued_at: string | null
  source: AdvisorySource
}

export interface AdvisoryIn {
  zone: Zone
  level: 'boil' | 'do_not_drink'
  message: string
  source: AdvisorySource
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
  message: string | null
  source: AdvisorySource | null
  issued_at: string | null
  last_checked: string
}

export interface SewageStatus {
  litres: number
  capacity_l: number
  percent: number
  daily_inflow_l: number
  days_until_full: number
  predicted_full: string
  is_full: boolean
}

export interface Measurement {
  source: MeasurementSource
  updated_at: string
  note: string
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
  sewage: SewageStatus
  measurement: Measurement
  safety: Safety
  delivery: Delivery
}

export type ReportType = 'clean_water_low' | 'sewage_full' | 'water_quality' | 'tank_damage' | 'illness' | 'other'

export interface ReportIn {
  event_id?: string
  source?: 'resident' | 'driver' | 'dispatcher' | 'sample'
  service_type?: ServiceType | null
  type: ReportType
  household_id: string
  timestamp?: string
  note?: string
  classifier_category?: ReportType
}

export interface Report extends ReportIn {
  event_id: string
  source: 'resident' | 'driver' | 'dispatcher' | 'sample'
  service_type: ServiceType | null
  reported_at: string | null
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
  service: Service
  vulnerable_type: VulnerableType | null
  advisory: WaterStatus | null
  hours_until_empty: number // water: until empty; sewage: until full
  litres_left: number
  litres_to_fill: number
  urgency: Urgency
  priority_score: number
  fits_in_load: boolean
  reason: string // English summary; UI builds a localized one from the fields
}

export interface Completion {
  event_id: string
  completed_at: string
  service_type: ServiceType
  run_id: string
  household_id: string
  zone: Zone
  truck_id: string
  service: Service
  at: string // ISO datetime
}

export interface RouteToday {
  run_id: string
  water_checks: CheckpointPair[]
  truck: Truck
  generated_at: string
  stops: RouteStop[]
  completed: Completion[]
}

// --- Dispatcher ----------------------------------------------------------------

export type ZoneState = 'ok' | 'low' | 'out' | 'advisory'

export interface ZoneStatus {
  zone: Zone
  households: number
  out_of_water: number
  running_low: number
  sewage_full: number
  illness_7d: number
  advisory: WaterStatus | null
  status: ZoneState
}

export interface LeakFlag {
  household_id: string
  zone: Zone
  kind: 'sudden_drop' | 'overnight_loss'
  litres_lost: number
  at: string
  note: string
}

export interface Staffing {
  drivers_available: number
  drivers_needed: number
  trucks_in_service: number
  trucks_total: number
}

export interface Dashboard {
  out_of_water: number
  running_low: number
  sewage_full: number
  delivered_today: number
  active_advisories: number
  sensor_homes: number
  estimated_homes: number
  sensor_pct: number
  possible_leaks: LeakFlag[]
  staffing: Staffing
  zones: ZoneStatus[]
}

export interface SharedFactor {
  kind: 'truck_and_day' | 'truck' | 'none'
  truck_id: string | null
  truck_name: string | null
  delivery_date: string | null
  weekday: string | null
  matching: number
  total: number
}

export interface OutbreakAlert {
  zone: Zone
  count: number
  window_days: number
  span_days: number
  baseline_weekly: number
  ratio: number
  households: string[]
  shared: SharedFactor
  water_quality_reports: number
  suggested_level: 'boil' | 'nodrink'
  advisory_active: WaterStatus | null
  summary: string // English; UI builds a localized version from the fields
  recommended_action: string
  how_detected: string[]
}

// --- Parts / sealift -------------------------------------------------------------

export type PartStatus = 'ok' | 'order' | 'critical'

export interface PartPlan extends Part {
  months_left: number | null
  runs_out_on: string | null
  status: PartStatus
  sealift_qty: number
  air_freight_qty: number
  reason: string
}

export interface OrderLine {
  part_id: string
  name: string
  unit: string
  quantity: number
  shipping: 'air_freight' | 'sealift'
}

export interface SealiftPlan {
  today: string
  next_sealift: string
  following_sealift: string
  days_until_deadline: number
  cover_months: number
  safety_buffer_pct: number
  parts: PartPlan[]
  at_risk: PartPlan[]
  order: OrderLine[]
}

// --- Sensor / classifier / attention ------------------------------------------------

export interface SensorPoint {
  at: string
  litres: number
}

export interface LeakSignal {
  kind: 'sudden_drop' | 'overnight_loss'
  start: string
  end: string
  litres_lost: number
  rate_l_per_h: number
  note: string
}

export interface SensorReading {
  household_id: string
  empty_tank_kg: number
  raw_weight_kg: number
  smoothed_weight_kg: number
  litres: number
  capacity_l: number
  updated_at: string
  series_24h: SensorPoint[]
  leak: LeakSignal | null
}

export interface Classification {
  category: ReportType
  confidence: number
  matched: string[]
  scores: Record<string, number>
}

export type AttentionKind =
  | 'sewage_full'
  | 'out_of_water'
  | 'clean_water_low'
  | 'illness'
  | 'water_quality'
  | 'possible_leak'
  | 'tank_damage'
  | 'other'

export interface AttentionItem {
  id: string
  kind: AttentionKind
  household_id: string
  zone: Zone
  at: string
  score: number
  priority: Urgency
  why: string
  detail: string | null
}
