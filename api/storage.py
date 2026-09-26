"""Transactional sample-sized state store, shared by all FastAPI instances.

Postgres holds one versioned JSON document. A row lock serializes mutations,
including deduplication and stock consumption. No database means sample mode;
a configured but unavailable database is an error, never a silent fallback.
"""
import os
import random
from contextvars import ContextVar
from dataclasses import asdict
from datetime import datetime

import anyio
from fastapi.encoders import jsonable_encoder
from starlette.concurrency import run_in_threadpool
from starlette.responses import JSONResponse

from api.ai.forecast import Reading
from api.ai.sensing import Sample
from api.models import Advisory, Breakdown, Completion, Driver, Household, Report, SeedData, Truck, WaterCheck
from api.state import State

MODEL_MAP = {"households": Household, "trucks": Truck, "advisories": Advisory, "drivers": Driver}
MODEL_LIST = {"completions": Completion, "reports": Report, "breakdowns": Breakdown, "water_checks": WaterCheck}


def snapshot(s):
    result = {"version": 1, "seed": s.seed.model_dump(mode="json"), "deliveries": s.deliveries}
    for field in MODEL_MAP:
        result[field] = {k: v.model_dump(mode="json") for k, v in getattr(s, field).items()}
    for field in MODEL_LIST:
        result[field] = [v.model_dump(mode="json") for v in getattr(s, field)]
    for field in ("readings", "sewage", "sensor_raw"):
        result[field] = {k: [asdict(v) for v in vs] for k, vs in getattr(s, field).items()}
    return jsonable_encoder(result)


def restore(data):
    if data.get("version") != 1:
        raise ValueError("Unsupported operational state version")
    s = State.__new__(State)
    s.seed = SeedData.model_validate(data["seed"])
    s._rng = random.Random(42)
    for field, model in MODEL_MAP.items():
        setattr(s, field, {k: model.model_validate(v) for k, v in data[field].items()})
    for field, model in MODEL_LIST.items():
        setattr(s, field, [model.model_validate(v) for v in data[field]])
    for field in ("readings", "sewage", "sensor_raw"):
        cls, value = (Sample, "value") if field == "sensor_raw" else (Reading, "litres")
        setattr(s, field, {k: [cls(datetime.fromisoformat(v["at"]), v[value]) for v in vs]
                           for k, vs in data[field].items()})
    s.deliveries = {k: {**v, "eta": datetime.fromisoformat(v["eta"]),
        "updated_at": datetime.fromisoformat(v["updated_at"])} for k, v in data["deliveries"].items()}
    return s


current_state = ContextVar("operational_state")


class StateProxy:
    def __getattr__(self, name):
        return getattr(current_state.get(), name)

    def reset(self):
        current_state.get().__init__()


state = StateProxy()


class Store:
    def __init__(self, url=None):
        self.url = os.getenv("DATABASE_URL", "") if url is None else url
        self.mode = "postgres" if self.url else "sample"
        self.sample = State() if not self.url else None
        self.lock = anyio.Lock()

    def open_database(self, writing):
        import psycopg
        conn = psycopg.connect(self.url, connect_timeout=10, prepare_threshold=None)
        try:
            conn.execute("SET LOCAL lock_timeout = '10s'")
            row = conn.execute("SELECT payload FROM northlink.operational_state WHERE id = 1" +
                               (" FOR UPDATE" if writing else "")).fetchone()
            if row is None:
                raise ValueError("Run python -m api.db seed before starting the API")
            return conn, restore(row[0])
        except Exception:
            conn.close()
            raise

    def save_database(self, conn, s):
        from psycopg.types.json import Jsonb
        conn.execute("UPDATE northlink.operational_state SET payload = %s, updated_at = now() WHERE id = 1",
                     (Jsonb(snapshot(s)),))
        conn.commit()

    async def handle(self, request, call_next):
        if not request.url.path.startswith("/api/") or request.url.path == "/api/health":
            return await call_next(request)
        writing = request.method not in ("GET", "HEAD", "OPTIONS")
        if self.mode == "sample":
            async with self.lock:
                s = restore(snapshot(self.sample)) if writing else self.sample
                token = current_state.set(s)
                try:
                    response = await call_next(request)
                    if writing and response.status_code < 400:
                        self.sample = s
                    return response
                finally:
                    current_state.reset(token)
        conn = None
        token = None
        try:
            conn, s = await run_in_threadpool(self.open_database, writing)
            token = current_state.set(s)
            response = await call_next(request)
            if writing and response.status_code < 400:
                await run_in_threadpool(self.save_database, conn, s)
            return response
        except Exception:
            # Do not expose connection strings, credentials, or SQL in responses.
            return JSONResponse({"detail": "Operational storage unavailable. Please retry."}, status_code=503)
        finally:
            if token is not None:
                current_state.reset(token)
            if conn is not None:
                await run_in_threadpool(conn.close)
