"""Pydantic models. Keep in sync with src/api/types.ts."""
from datetime import date, datetime
from typing import Literal

from pydantic import AwareDatetime, BaseModel, Field, model_validator
from uuid import uuid4

Zone = Literal["A", "B", "C", "D", "E", "F"]
VulnerableType = Literal["elder", "infant", "medical"]
MeasurementSource = Literal["sensor", "estimated"]
Service = Literal["water", "sewage"]
ServiceType = Literal["water", "sewage_full", "sewage_blocked"]


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
    service: Service = "water"


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
    verification_status: Literal["unverified"] = "unverified"


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
    timestamp: AwareDatetime | None = None
    note: str | None = None
    # Set when the resident typed a description and confirmed the classifier's guess.
    classifier_category: ReportType | None = None
    source: Literal["resident", "driver", "dispatcher", "sample"] = "resident"
    event_id: str = Field(default_factory=lambda: str(uuid4()), min_length=1, max_length=100)
    service_type: Literal["water", "sewage_full", "sewage_blocked"] | None = None

    @model_validator(mode="after")
    def matching_report_service(self):
        if self.type == "clean_water_low" and self.service_type not in (None, "water"):
            raise ValueError("A low-water report must request water service")
        if self.type == "sewage_full" and self.service_type == "water":
            raise ValueError("A sewage report must request sanitation service")
        return self


class Report(ReportIn):
    id: str
    timestamp: datetime
    zone: Zone
    reported_at: datetime | None = None


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
    event_id: str
    household_id: str
    zone: Zone
    truck_id: str
    service: Service = "water"
    at: datetime
    completed_at: datetime
    service_type: ServiceType
    run_id: str


class RouteToday(BaseModel):
    run_id: str
    truck: Truck
    generated_at: datetime
    stops: list[RouteStop]
    completed: list[Completion]
    water_checks: list["CheckpointPair"] = []


class CompleteIn(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid4()), min_length=1, max_length=100)
    truck_id: str | None = None
    timestamp: AwareDatetime | None = None
    service: Service = "water"
    service_type: ServiceType | None = None
    run_id: str | None = None

    @model_validator(mode="after")
    def matching_service(self):
        if self.service_type and (self.service_type == "water") != (self.service == "water"):
            raise ValueError("service and service_type must agree")
        return self


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
    storage: Literal["sample", "postgres"] = "sample"


# --- Shared operations --------------------------------------------------------

class Driver(BaseModel):
    id: str
    name: str
    service: Service
    status: Literal["available", "standby", "absent"]


class ReadinessIn(BaseModel):
    drivers: dict[str, Literal["available", "standby", "absent"]] = Field(default_factory=dict)
    trucks: dict[str, Literal["in_service", "maintenance", "out_of_service"]] = Field(default_factory=dict)


class ServiceRequest(BaseModel):
    id: str
    household_id: str
    service_type: ServiceType
    source: Literal["resident", "driver", "dispatcher", "sample"]
    reported_at: datetime
    completion_event_id: str | None = None
    completed_at: datetime | None = None
    response_seconds: float | None = None


class VisitSummary(BaseModel):
    household_id: str
    service_type: ServiceType
    last_visit: datetime | None
    visit_count: int


class ServiceCoverage(BaseModel):
    service: Service
    drivers_available: int
    drivers_standby: int
    trucks_in_service: int
    crews_available: int
    crews_needed: int
    shortfall: int
    households_per_truck: int | None = None
    household_coverage: int | None = None
    uncovered_households: int | None = None


class Coverage(BaseModel):
    drivers_available: int
    drivers_standby: int
    trucks_in_service: int
    shortfall: bool
    water: ServiceCoverage
    sanitation: ServiceCoverage
    assumption: str


class Operations(BaseModel):
    storage: Literal["sample", "postgres"]
    open_requests: list[ServiceRequest]
    completed_requests: list[ServiceRequest]
    visits: list[VisitSummary]
    completions: list[Completion]
    drivers: list[Driver]
    trucks: list[Truck]
    coverage: Coverage


class BreakdownIn(BaseModel):
    model_config = {"str_strip_whitespace": True}
    event_id: str = Field(default_factory=lambda: str(uuid4()), min_length=1, max_length=100)
    truck_id: str
    part_id: str
    symptom: str = Field(min_length=1, max_length=1000)
    cause_category: Literal["unknown", "wear", "freeze", "electrical", "other"] = "unknown"
    cause_confirmed: bool = False
    opened_at: AwareDatetime

    @model_validator(mode="after")
    def unknown_is_unconfirmed(self):
        if self.cause_category == "unknown" and self.cause_confirmed:
            raise ValueError("An unknown cause cannot be confirmed")
        return self


class Breakdown(BreakdownIn):
    status: Literal["open", "repairing", "fixed"] = "open"
    fixed_at: datetime | None = None
    stock_quantity: int
    parts_used: int = 0
    restoration_seconds: float | None = None


class RepairIn(BaseModel):
    status: Literal["repairing", "fixed"]
    fixed_at: AwareDatetime | None = None
    parts_used: int = Field(default=0, ge=0)


class StockIn(BaseModel):
    on_hand: int = Field(ge=0)


class WaterCheckIn(BaseModel):
    model_config = {"str_strip_whitespace": True}
    event_id: str = Field(default_factory=lambda: str(uuid4()), min_length=1, max_length=100)
    checkpoint: Literal["source", "drop_point"]
    truck_id: str
    run_id: str = Field(min_length=1, max_length=150)
    household_id: str | None = None
    sampled_at: AwareDatetime
    collector: str = Field(min_length=1, max_length=100)
    parameter: str = Field(min_length=1, max_length=100)
    value: float = Field(allow_inf_nan=False)
    units: str = Field(min_length=1, max_length=60)
    method: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def checkpoint_household(self):
        if (self.checkpoint == "drop_point") != bool(self.household_id):
            raise ValueError("A household is required only for a drop-point check")
        return self


class WaterCheck(WaterCheckIn):
    review_status: Literal["unreviewed", "reviewed", "follow_up"] = "unreviewed"
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    sample_data: Literal[True] = True


class ReviewIn(BaseModel):
    model_config = {"str_strip_whitespace": True}
    review_status: Literal["reviewed", "follow_up"]
    reviewed_by: str = Field(min_length=1, max_length=100)


class CheckpointPair(BaseModel):
    household_id: str
    source: list[WaterCheck]
    drop_point: list[WaterCheck]
    flags: list[Literal["missing_source", "missing_drop_point", "unreviewed", "follow_up"]]


RouteToday.model_rebuild()
