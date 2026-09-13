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

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(patients_router)

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