from fastapi import APIRouter

from app.api.routes.patients import router as patients_router
from app.api.routes.caregivers import router as caregivers_router
from app.api.routes.navigators import router as navigators_router
from app.api.routes.assignments import router as assignments_router
from app.api.routes.care_journey import router as care_journey_router
from app.api.routes.appointments import router as appointments_router
from app.api.routes.documents import router as documents_router
from app.api.routes.check_ins import router as check_ins_router
from app.api.routes.users import router as users_router
from app.api.routes.organizations import router as organizations_router

api_router = APIRouter(
    prefix="/api",
)
api_router.include_router(organizations_router)
api_router.include_router(users_router)
api_router.include_router(patients_router)
api_router.include_router(caregivers_router)
api_router.include_router(navigators_router)
api_router.include_router(assignments_router)
api_router.include_router(care_journey_router)
api_router.include_router(appointments_router)
api_router.include_router(documents_router)
api_router.include_router(check_ins_router)
