"""Pydantic models. Keep in sync with src/api/types.ts."""
from datetime import date
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


class SeedData(BaseModel):
    generated_for: date
    note: str
    households: list[Household]
    trucks: list[Truck]
    illness_reports: list[IllnessReport]
    parts: list[Part]


class Health(BaseModel):
    status: Literal["ok"]
    version: str
