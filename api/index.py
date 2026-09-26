"""Northlink API — FastAPI app, served by Vercel as a Python serverless function."""
import json
import sys
from functools import lru_cache
from pathlib import Path

# Make `api.*` importable both under uvicorn (run from repo root) and on Vercel.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI  # noqa: E402

from api.models import Health, Household, SeedData  # noqa: E402

SEED_PATH = Path(__file__).resolve().parent / "data" / "seed.json"

app = FastAPI(title="Northlink API", version="0.1.0")


@lru_cache
def load_seed() -> SeedData:
    return SeedData.model_validate(json.loads(SEED_PATH.read_text(encoding="utf-8")))


@app.get("/api/health", response_model=Health)
def health() -> Health:
    return Health(status="ok", version=app.version)


@app.get("/api/households", response_model=list[Household])
def households() -> list[Household]:
    return load_seed().households
