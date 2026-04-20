from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from time import monotonic
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.db import (
    init_db,
    seed_lawyers_if_empty,
    seed_users_if_empty,
)
from app.settings import validate_runtime_configuration

from app.routers import auth, kyc, lawyers, system, messaging, consultations, payments, compliance

def _env_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        parsed = int(raw_value)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def _env_bool(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
SLOW_REQUEST_MS = _env_int("SLOW_REQUEST_MS", 800)
ENABLE_REQUEST_LOGGING = _env_bool("ENABLE_REQUEST_LOGGING", True)

logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO), format="%(message)s")
logger = logging.getLogger("legal_mvp")

@asynccontextmanager
async def lifespan(_: FastAPI):
    validate_runtime_configuration()
    init_db()
    seed_lawyers_if_empty()
    seed_users_if_empty()
    yield

app = FastAPI(title="Nigeria Legal Marketplace MVP", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def request_observability_middleware(request: Request, call_next):
    if not ENABLE_REQUEST_LOGGING:
        return await call_next(request)

    request_id = request.headers.get("X-Request-Id") or uuid4().hex[:12]
    started_at = monotonic()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((monotonic() - started_at) * 1000, 2)
        logger.exception(
            json.dumps(
                {
                    "event": "request_error",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                }
            )
        )
        raise

    duration_ms = round((monotonic() - started_at) * 1000, 2)
    log_level = logging.WARNING if duration_ms >= SLOW_REQUEST_MS else logging.INFO
    logger.log(
        log_level,
        json.dumps(
            {
                "event": "request_complete",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
        ),
    )
    response.headers["X-Request-Id"] = request_id
    return response

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

# Map all domain routers
app.include_router(auth.router)
app.include_router(kyc.router)
app.include_router(lawyers.router)
app.include_router(system.router)
app.include_router(messaging.router)
app.include_router(consultations.router)
app.include_router(payments.router)
app.include_router(compliance.router)
