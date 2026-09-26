"""Pydantic models. Keep in sync with src/api/types.ts."""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

Zone = Literal["A", "B", "C", "D", "E", "F"]
VulnerableType = Literal["elder", "infant", "medical"]
MeasurementSource = Literal["sensor", "estimated"]
Service = Literal["water", "sewage"]


class Household(BaseModel):
    id: str  # e.g. "A-12"
    zone: Zone
    household_size: int
    tank_capacity_l: int
    current_level_l: int
    last_delivery: date
    last_delivery_litres: int = 1000  # logged by the driver
    vulnerable: bool  # elders, infants, or medical needs
    vulnerable_type: VulnerableType | None = None
    last_truck_id: str
    # How we know the clean-water level: load-cell tank sensor, or estimate from last delivery.
    measurement_source: MeasurementSource = "estimated"
    empty_tank_weight_kg: float | None = None
    # Wastewater (sewage) tank. When full, a red light turns on and the home cannot use water.
    sewage_capacity_l: int = 1000
    sewage_level_l: int = 0
    last_sewage_pickup: date | None = None
    sensor_leak_demo: bool = False  # seed only: simulate a leak on this sensor


class Truck(BaseModel):
    id: str
    name: str
    capacity_l: int
    status: Literal["in_service", "maintenance", "out_of_service"]
    zones: list[Zone]
    last_disinfection: date


class IllnessReport(BaseModel):
    id: str
    household_id: str
    zone: Zone
    reported: date
    symptoms: list[str]
    people_affected: int
    truck_id: str


class Part(BaseModel):
    id: str
    name: str
    category: Literal["treatment", "truck", "household"]
    unit: str
    on_hand: int
    monthly_use: float


class Partner(BaseModel):
    id: str
    type: Literal["health", "provincial", "federal", "supplier"]
    name: str
    helps_with: list[str]
    request_template: Literal["water_testing", "general", "parts"]


WaterStatus = Literal["safe", "boil", "nodrink"]
AdvisorySource = Literal["Municipal water office", "Regional health board"]


class Advisory(BaseModel):
    """Official advisory. Only staff issue these; Northlink never decides water safety."""

    zone: Zone
    status: WaterStatus  # "boil" or "nodrink" for an active advisory
    since: date
    reason: str
    message: str | None = None
    issued_at: datetime | None = None
    source: AdvisorySource = "Municipal water office"


class AdvisoryIn(BaseModel):
    zone: Zone
    level: Literal["boil", "do_not_drink"]
    message: str
    source: AdvisorySource = "Municipal water office"


ReportType = Literal["clean_water_low", "sewage_full", "water_quality", "tank_damage", "illness", "other"]


class ReportIn(BaseModel):
    type: ReportType
    household_id: str
    timestamp: datetime | None = None
    note: str | None = None
    # Set when the resident typed a description and confirmed the classifier's guess.
    classifier_category: ReportType | None = None


class Report(ReportIn):
    id: str
    timestamp: datetime
    zone: Zone


class SeedData(BaseModel):
    generated_for: date
    note: str
    households: list[Household]
    trucks: list[Truck]
    illness_reports: list[IllnessReport]
    parts: list[Part]
    advisories: list[Advisory] = []
    baseline_weekly_illness: dict[str, float] = {}
    partners: list[Partner] = []
    resident_reports: list[Report] = []


# --- Resident status ---------------------------------------------------------

LevelChoice = Literal["full", "three_quarters", "half", "quarter", "empty"]
DeliveryStage = Literal["scheduled", "truck_loaded", "en_route", "nearby", "delivered"]
DELIVERY_STAGES: list[DeliveryStage] = ["scheduled", "truck_loaded", "en_route", "nearby", "delivered"]


class Forecast(BaseModel):
    litres_left: int
    capacity_l: int
    percent: int
    daily_use_l: int
    days_left: float
    predicted_empty: datetime
    confidence: Literal["low", "medium", "high"]
    confidence_note: str
    method: Literal["household_size", "blended"]


class SewageStatus(BaseModel):
    litres: int
    capacity_l: int
    percent: int
    daily_inflow_l: int
    days_until_full: float
    predicted_full: datetime
    is_full: bool


class Measurement(BaseModel):
    source: MeasurementSource
    updated_at: datetime
    note: str


class Safety(BaseModel):
    status: WaterStatus
    zone: Zone
    since: date | None
    reason: str | None
    message: str | None = None
    source: AdvisorySource | None = None
    issued_at: datetime | None = None
    last_checked: datetime


class Delivery(BaseModel):
    stage: DeliveryStage
    stage_index: int
    truck_id: str
    truck_name: str
    eta: datetime
    updated_at: datetime


class HouseholdStatus(BaseModel):
    household: Household
    forecast: Forecast
    sewage: SewageStatus
    measurement: Measurement
    safety: Safety
    delivery: Delivery


class LevelUpdate(BaseModel):
    level: LevelChoice


# --- Sensor ----------------------------------------------------------------------


class SensorPoint(BaseModel):
    at: datetime
    litres: float


class LeakSignalOut(BaseModel):
    kind: Literal["sudden_drop", "overnight_loss"]
    start: datetime
    end: datetime
    litres_lost: float
    rate_l_per_h: float
    note: str


class SensorReading(BaseModel):
    household_id: str
    empty_tank_kg: float
    raw_weight_kg: float  # live, noisy load-cell reading
    smoothed_weight_kg: float
    litres: float
    capacity_l: int
    updated_at: datetime
    series_24h: list[SensorPoint]
    leak: LeakSignalOut | None


class SimulateUsage(BaseModel):
    litres: float = 25.0


# --- Classifier ------------------------------------------------------------------


class ClassifyIn(BaseModel):
    text: str


class ClassifyOut(BaseModel):
    category: ReportType
    confidence: float
    matched: list[str]
    scores: dict[str, float]


# --- Driver route ------------------------------------------------------------

Urgency = Literal["urgent", "soon", "ok"]


class RouteStop(BaseModel):
    rank: int
    household_id: str
    zone: Zone
    service: Service
    vulnerable_type: VulnerableType | None
    advisory: WaterStatus | None
    hours_until_empty: float  # water: until empty; sewage: until full
    litres_left: int
    litres_to_fill: int
    urgency: Urgency
    priority_score: float
    fits_in_load: bool
    reason: str


class Completion(BaseModel):
    household_id: str
    zone: Zone
    truck_id: str
    service: Service = "water"
    at: datetime


class RouteToday(BaseModel):
    truck: Truck
    generated_at: datetime
    stops: list[RouteStop]
    completed: list[Completion]


class CompleteIn(BaseModel):
    truck_id: str | None = None
    timestamp: datetime | None = None
    service: Service = "water"


# --- Dispatcher ---------------------------------------------------------------

ZoneState = Literal["ok", "low", "out", "advisory"]


class ZoneStatus(BaseModel):
    zone: Zone
    households: int
    out_of_water: int
    running_low: int
    sewage_full: int
    illness_7d: int
    advisory: WaterStatus | None
    status: ZoneState


class LeakFlag(BaseModel):
    household_id: str
    zone: Zone
    kind: Literal["sudden_drop", "overnight_loss"]
    litres_lost: float
    at: datetime
    note: str


class Staffing(BaseModel):
    drivers_available: int
    drivers_needed: int
    trucks_in_service: int
    trucks_total: int


class Dashboard(BaseModel):
    out_of_water: int
    running_low: int
    sewage_full: int
    delivered_today: int
    active_advisories: int
    sensor_homes: int
    estimated_homes: int
    sensor_pct: int
    possible_leaks: list[LeakFlag]
    staffing: Staffing
    zones: list[ZoneStatus]


class SharedFactorOut(BaseModel):
    kind: Literal["truck_and_day", "truck", "none"]
    truck_id: str | None
    truck_name: str | None
    delivery_date: date | None
    weekday: str | None
    matching: int
    total: int


class OutbreakAlertOut(BaseModel):
    """A signal for staff review — not a diagnosis, never an automatic advisory."""

    zone: Zone
    count: int
    window_days: int
    span_days: int
    baseline_weekly: float
    ratio: float
    households: list[str]
    shared: SharedFactorOut
    water_quality_reports: int
    suggested_level: Literal["boil", "nodrink"]
    advisory_active: WaterStatus | None
    summary: str
    recommended_action: str
    how_detected: list[str]


class AttentionItemOut(BaseModel):
    id: str
    kind: Literal[
        "sewage_full", "out_of_water", "clean_water_low", "illness", "water_quality", "possible_leak", "tank_damage", "other"
    ]
    household_id: str
    zone: Zone
    at: datetime
    score: int
    priority: Urgency
    why: str
    detail: str | None


# --- Parts / sealift -----------------------------------------------------------

PartStatus = Literal["ok", "order", "critical"]


class PartPlanOut(BaseModel):
    id: str
    name: str
    category: Literal["treatment", "truck", "household"]
    unit: str
    on_hand: int
    monthly_use: float
    months_left: float | None
    runs_out_on: date | None
    status: PartStatus
    sealift_qty: int
    air_freight_qty: int
    reason: str


class OrderLine(BaseModel):
    part_id: str
    name: str
    unit: str
    quantity: int
    shipping: Literal["air_freight", "sealift"]


class SealiftPlan(BaseModel):
    today: date
    next_sealift: date
    following_sealift: date
    days_until_deadline: int
    cover_months: int
    safety_buffer_pct: int
    parts: list[PartPlanOut]
    at_risk: list[PartPlanOut]
    order: list[OrderLine]


class Health(BaseModel):
    status: Literal["ok"]
    version: str
