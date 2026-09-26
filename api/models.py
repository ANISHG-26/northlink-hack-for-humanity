"""Pydantic models. Keep in sync with src/api/types.ts."""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

Zone = Literal["A", "B", "C", "D", "E", "F"]


class Household(BaseModel):
    id: str  # e.g. "A-12"
    zone: Zone
    household_size: int
    tank_capacity_l: int
    current_level_l: int
    last_delivery: date
    vulnerable: bool  # elders, infants, or medical needs
    last_truck_id: str


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
    on_hand: int
    min_stock: int
    monthly_use: float
    lead_time_days: int
    next_sealift: date


WaterStatus = Literal["safe", "boil", "nodrink"]


class Advisory(BaseModel):
    zone: Zone
    status: WaterStatus
    since: date
    reason: str


class SeedData(BaseModel):
    generated_for: date
    note: str
    households: list[Household]
    trucks: list[Truck]
    illness_reports: list[IllnessReport]
    parts: list[Part]
    advisories: list[Advisory] = []


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


class Safety(BaseModel):
    status: WaterStatus
    zone: Zone
    since: date | None
    reason: str | None


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
    safety: Safety
    delivery: Delivery


class LevelUpdate(BaseModel):
    level: LevelChoice


ReportType = Literal["water_quality", "tank_damage", "illness"]


class ReportIn(BaseModel):
    type: ReportType
    household_id: str
    timestamp: datetime | None = None
    note: str | None = None


class Report(ReportIn):
    id: str
    timestamp: datetime
    zone: Zone


class Health(BaseModel):
    status: Literal["ok"]
    version: str
