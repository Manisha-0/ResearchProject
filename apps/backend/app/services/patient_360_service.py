from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.attention_snapshot import (
    AttentionSnapshot,
)
from app.models.caregiver import (
    CaregiverPatientAccess,
    CaregiverPermission,
    CaregiverProfile,
)
from app.models.check_in import CheckIn
from app.models.enums import (
    CaregiverAccessStatus,
    NavigationNeedStatus,
    NavigationTaskStatus,
)
from app.models.journey import CareJourneyItem
from app.models.navigation_need import NavigationNeed
from app.models.navigation_task import NavigationTask
from app.services.follow_up_service import get_items
from app.services.task_service import item_responses
from app.models.patient import PatientProfile
from app.models.user import User
from app.schemas.patient_360 import (
    Patient360AppointmentResponse,
    Patient360AttentionResponse,
    Patient360CaregiverResponse,
    Patient360CheckInResponse,
    Patient360NeedResponse,
    Patient360ProfileResponse,
    Patient360ResolutionResponse,
    Patient360Response,
    Patient360TaskResponse,
)
from app.services.context_engine import (
    evaluate_and_snapshot_patient,
)


def build_patient_360(
    db: Session,
    *,
    patient: PatientProfile,
) -> Patient360Response:
    """
    Build the current Patient 360 view for a navigator.

    The caller is responsible for authorization before
    invoking this service.
    """

    patient_user = db.get(
        User,
        patient.user_id,
    )

    if patient_user is None:
        raise ValueError(
            "Patient user account is missing."
        )

    # ---------------------------------------------------------
    # Attention
    # ---------------------------------------------------------

    latest_snapshot = db.scalar(
        select(AttentionSnapshot)
        .where(
            AttentionSnapshot.patient_id
            == patient.id
        )
        .order_by(
            AttentionSnapshot.created_at.desc()
        )
        .limit(1)
    )

    if latest_snapshot is None:
        (
            attention_status,
            attention_explanation,
            open_attention_needs,
        ) = evaluate_and_snapshot_patient(
            db,
            patient_id=patient.id,
        )

        open_need_count = len(
            open_attention_needs
        )

    else:
        attention_status = (
            latest_snapshot.status
        )
        attention_explanation = (
            latest_snapshot.explanation
        )
        open_need_count = (
            latest_snapshot.open_need_count
        )

    # ---------------------------------------------------------
    # Upcoming appointments
    # ---------------------------------------------------------

    now = datetime.now(timezone.utc)

    appointment_rows = db.execute(
        select(
            Appointment,
            CareJourneyItem,
        )
        .join(
            CareJourneyItem,
            CareJourneyItem.id
            == Appointment.journey_item_id,
        )
        .where(
            Appointment.patient_id
            == patient.id,
            Appointment.scheduled_start
            >= now,
        )
        .order_by(
            Appointment.scheduled_start.asc()
        )
        .limit(10)
    ).all()

    upcoming_appointments = [
        Patient360AppointmentResponse(
            appointment_id=appointment.id,
            journey_item_id=(
                appointment.journey_item_id
            ),
            title=journey_item.title,
            scheduled_start=(
                appointment.scheduled_start
            ),
            scheduled_end=(
                appointment.scheduled_end
            ),
            status=appointment.status.value,
            appointment_type=(
                appointment.appointment_type
            ),
            provider_name=(
                appointment.provider_name
            ),
            department=appointment.department,
            location_name=(
                appointment.location_name
            ),
        )
        for appointment, journey_item
        in appointment_rows
    ]

    # ---------------------------------------------------------
    # Recent check-ins
    # ---------------------------------------------------------

    check_ins = db.scalars(
        select(CheckIn)
        .where(
            CheckIn.patient_id
            == patient.id
        )
        .order_by(
            CheckIn.created_at.desc()
        )
        .limit(5)
    ).all()

    recent_check_ins = [
        Patient360CheckInResponse(
            check_in_id=check_in.id,
            source=check_in.source,
            symptom_severity=(
                check_in.symptom_severity
            ),
            transportation_confirmed=(
                check_in.transportation_confirmed
            ),
            medication_access_issue=(
                check_in.medication_access_issue
            ),
            financial_concern=(
                check_in.financial_concern
            ),
            requested_help=(
                check_in.requested_help
            ),
            free_text=check_in.free_text,
            created_at=check_in.created_at,
        )
        for check_in in check_ins
    ]

    # ---------------------------------------------------------
    # Active caregivers
    # ---------------------------------------------------------

    caregiver_rows = db.execute(
        select(
            CaregiverPatientAccess,
            CaregiverProfile,
        )
        .join(
            CaregiverProfile,
            CaregiverProfile.user_id
            == CaregiverPatientAccess
            .caregiver_user_id,
        )
        .where(
            CaregiverPatientAccess.patient_id
            == patient.id,
            # Show waiting and invited caregivers too, so the
            # navigator can record consent or chase activation.
            CaregiverPatientAccess.status
            != CaregiverAccessStatus.REVOKED,
        )
        .order_by(
            CaregiverProfile.last_name.asc(),
            CaregiverProfile.first_name.asc(),
        )
    ).all()

    caregivers = []

    for access, caregiver_profile in caregiver_rows:
        permissions = list(
            db.scalars(
                select(
                    CaregiverPermission.permission
                ).where(
                    CaregiverPermission
                    .caregiver_access_id
                    == access.id
                )
            ).all()
        )

        caregivers.append(
            Patient360CaregiverResponse(
                caregiver_access_id=access.id,
                caregiver_user_id=(
                    access.caregiver_user_id
                ),
                first_name=(
                    caregiver_profile.first_name
                ),
                last_name=(
                    caregiver_profile.last_name
                ),
                relationship=access.relationship,
                status=access.status,
                permissions=permissions,
                approved_at=access.approved_at,
                consent_method=access.consent_method,
                consent_given_by=access.consent_given_by,
            )
        )

    # ---------------------------------------------------------
    # Open navigation needs
    # ---------------------------------------------------------

    needs = db.scalars(
        select(NavigationNeed)
        .where(
            NavigationNeed.patient_id
            == patient.id,
            NavigationNeed.status
            == NavigationNeedStatus.OPEN,
        )
        .order_by(
            NavigationNeed.due_at.asc()
            .nulls_last(),
            NavigationNeed.created_at.asc(),
        )
    ).all()

    open_needs = [
        Patient360NeedResponse(
            need_id=need.id,
            need_type=need.need_type,
            title=need.title,
            explanation=need.explanation,
            recommended_action=(
                need.recommended_action
            ),
            attention_status=(
                need.attention_status
            ),
            status=need.status,
            due_at=need.due_at,
        )
        for need in needs
    ]

    # ---------------------------------------------------------
    # Active navigator tasks
    # ---------------------------------------------------------

    active_task_statuses = [
        NavigationTaskStatus.OPEN,
        NavigationTaskStatus.IN_PROGRESS,
    ]

    tasks = db.scalars(
        select(NavigationTask)
        .where(
            NavigationTask.patient_id
            == patient.id,
            NavigationTask.status.in_(
                active_task_statuses
            ),
        )
        .order_by(
            NavigationTask.due_at.asc()
            .nulls_last(),
            NavigationTask.created_at.asc(),
        )
    ).all()

    active_tasks = [
        Patient360TaskResponse(
            task_id=task.id,
            navigation_need_id=(
                task.navigation_need_id
            ),
            title=task.title,
            description=task.description,
            status=task.status,
            due_at=task.due_at,
            completed_at=task.completed_at,
            resolution_note=(
                task.resolution_note
            ),
            kind=task.kind,
            items=item_responses(db, task),
        )
        for task in tasks
    ]

    # ---------------------------------------------------------
    # Recent completed navigator work
    # ---------------------------------------------------------

    completed_task_rows = db.execute(
        select(
            NavigationTask,
            NavigationNeed,
        )
        .join(
            NavigationNeed,
            NavigationNeed.id
            == NavigationTask.navigation_need_id,
        )
        .where(
            NavigationTask.patient_id
            == patient.id,
            NavigationTask.status
            == NavigationTaskStatus.COMPLETED,
            NavigationTask.completed_at.is_not(
                None
            ),
        )
        .order_by(
            NavigationTask.completed_at.desc()
        )
        .limit(5)
    ).all()

    recent_resolutions = [
        Patient360ResolutionResponse(
            task_id=task.id,
            navigation_need_id=(
                task.navigation_need_id
            ),
            need_title=(
                ", ".join(item.label for item in get_items(db, task_id=task.id))
                if task.kind == "follow_up"
                else need.title
            ),
            task_title=task.title,
            completed_at=task.completed_at,
            resolution_note=(
                task.resolution_note
                or "Completed without a resolution note."
            ),
        )
        for task, need in completed_task_rows
    ]

    return Patient360Response(
        profile=Patient360ProfileResponse(
            patient_id=patient.id,
            user_id=patient.user_id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            date_of_birth=(
                patient.date_of_birth
            ),
            email=patient_user.email,
            phone=patient.phone,
            preferred_language=(
                patient.preferred_language
            ),
            preferred_contact_method=(
                patient.preferred_contact_method
            ),
            care_program=patient.care_program,
            external_patient_reference=(
                patient.external_patient_reference
            ),
        ),
        attention=Patient360AttentionResponse(
            status=attention_status,
            explanation=attention_explanation,
            open_need_count=open_need_count,
        ),
        upcoming_appointments=(
            upcoming_appointments
        ),
        recent_check_ins=recent_check_ins,
        caregivers=caregivers,
        open_needs=open_needs,
        active_tasks=active_tasks,
        recent_resolutions=recent_resolutions,
    )