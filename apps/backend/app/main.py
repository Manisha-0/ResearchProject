from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.patients import (
    router as patients_router,
)
from app.routers.caregivers import (
    router as caregivers_router,
)
from app.routers.patient_caregivers import (
    router as patient_caregivers_router,
)
from app.routers.caregiver_portal import (
    router as caregiver_portal_router,
)
from app.routers.appointments import (
    router as appointments_router,
)
from app.routers.journey import (
    router as journey_router,
)
from app.routers.patient_journey import (
    router as patient_journey_router,
)
from app.routers.check_ins import (
    router as check_ins_router,
)
from app.routers.signals import (
    router as signals_router,
)
from app.routers.attention import (
    router as attention_router,
)
from app.routers.action_center import (
    router as action_center_router,
)
from app.routers.tasks import (
    router as tasks_router,
)
from app.routers.navigator_tasks import (
    router as navigator_tasks_router,
)
from app.routers.patient_360 import (
    router as patient_360_router,
)
from app.routers.navigator_dashboard import (
    router as navigator_dashboard_router,
)

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(patients_router)
app.include_router(caregivers_router)
app.include_router(
    patient_caregivers_router
)
app.include_router(
    caregiver_portal_router
)
app.include_router(journey_router)
app.include_router(appointments_router)
app.include_router(patient_journey_router)
app.include_router(check_ins_router)
app.include_router(signals_router)
app.include_router(attention_router)
app.include_router(
    action_center_router
)
app.include_router(tasks_router)
app.include_router(
    navigator_tasks_router
)
app.include_router(
    patient_360_router
)
app.include_router(
    navigator_dashboard_router
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "environment": settings.app_env,
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
    }


@app.get("/health/database")
def database_health(
    db: Session = Depends(get_db),
):
    db.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "database": "connected",
    }