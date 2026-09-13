from fastapi import FastAPI
from sqlalchemy import text

from app.db.database import engine
from app.api.router import api_router

app = FastAPI(
    title="Compass API",
    version="1.0.0",
)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "Compass API",
    }


@app.get("/api/health/db")
def database_health_check():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": result.scalar(),
        }
    
app.include_router(api_router)    