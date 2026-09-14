import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db

from app.models.enums import UserRole
from app.models.user import User

from app.schemas.copilot import (
    CopilotQuestionRequest,
    CopilotResponse,
)

from app.services.copilot_context_service import (
    CopilotContextError,
    build_copilot_context,
)

from app.services.copilot_service import (
    CopilotServiceError,
    answer_copilot_question,
)

from app.services.permissions import (
    get_patient_for_navigator,
)


router = APIRouter(
    prefix="/patients/{patient_id}",
    tags=["Copilot"],
)


@router.post(
    "/copilot",
    response_model=CopilotResponse,
)
def ask_patient_copilot(
    patient_id: uuid.UUID,
    payload: CopilotQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.NAVIGATOR
        )
    ),
) -> CopilotResponse:
    """
    Ask Compass Copilot a grounded
    navigation question about an assigned
    patient.

    Gemini explains patient-record
    information only.

    Compass rules remain authoritative for
    Attention Status.
    """

    get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    try:
        (
            context_entries,
            source_registry,
        ) = build_copilot_context(
            db,
            patient_id=patient_id,
        )

        return answer_copilot_question(
            question=payload.question,
            context_entries=context_entries,
            source_registry=source_registry,
        )

    except CopilotContextError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(exc),
        ) from exc

    except CopilotServiceError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(exc),
        ) from exc