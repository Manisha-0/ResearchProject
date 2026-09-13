from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.enums import (
    AttentionStatus,
    NavigationTaskStatus,
)
from app.models.patient import (
    NavigatorPatientAssignment,
    PatientProfile,
)
from app.models.navigation_task import (
    NavigationTask,
)
from app.models.user import User
from app.schemas.navigator_dashboard import (
    NavigatorDashboardCountsResponse,
    NavigatorDashboardPatientResponse,
    NavigatorDashboardResponse,
    NavigatorDashboardTaskResponse,
)
from app.services.context_engine import (
    evaluate_and_snapshot_patient,
)


def build_navigator_dashboard(
    db: Session,
    *,
    navigator: User,
) -> NavigatorDashboardResponse:
    patients = list(
        db.scalars(
            select(PatientProfile)
            .join(
                NavigatorPatientAssignment,
                NavigatorPatientAssignment
                .patient_id
                == PatientProfile.id,
            )
            .where(
                NavigatorPatientAssignment
                .navigator_user_id
                == navigator.id
            )
        ).all()
    )

    patient_rows = []

    needs_attention_count = 0
    follow_up_count = 0
    on_track_count = 0

    now = datetime.now(timezone.utc)

    for patient in patients:
        (
            attention_status,
            explanation,
            needs,
        ) = evaluate_and_snapshot_patient(
            db,
            patient_id=patient.id,
        )

        if (
            attention_status
            == AttentionStatus.NEEDS_ATTENTION
        ):
            needs_attention_count += 1

        elif (
            attention_status
            == AttentionStatus.FOLLOW_UP
        ):
            follow_up_count += 1

        else:
            on_track_count += 1

        next_appointment = db.scalar(
            select(Appointment)
            .where(
                Appointment.patient_id
                == patient.id,
                Appointment.scheduled_start
                >= now,
            )
            .order_by(
                Appointment.scheduled_start.asc()
            )
            .limit(1)
        )

        patient_rows.append(
            NavigatorDashboardPatientResponse(
                patient_id=patient.id,
                first_name=patient.first_name,
                last_name=patient.last_name,
                care_program=(
                    patient.care_program
                ),
                attention_status=(
                    attention_status
                ),
                explanation=explanation,
                open_need_count=len(needs),
                next_appointment_at=(
                    next_appointment
                    .scheduled_start
                    if next_appointment
                    else None
                ),
            )
        )

    # ---------------------------------------------------------
    # Navigator tasks
    # ---------------------------------------------------------

    tasks = list(
        db.scalars(
            select(NavigationTask).where(
                NavigationTask.assigned_to_user_id
                == navigator.id,
                NavigationTask.status.in_(
                    [
                        NavigationTaskStatus.OPEN,
                        NavigationTaskStatus
                        .IN_PROGRESS,
                    ]
                ),
            )
        ).all()
    )

    open_task_count = sum(
        1
        for task in tasks
        if task.status
        == NavigationTaskStatus.OPEN
    )

    in_progress_task_count = sum(
        1
        for task in tasks
        if task.status
        == NavigationTaskStatus.IN_PROGRESS
    )

    task_rows = []

    for task in tasks:
        patient = db.get(
            PatientProfile,
            task.patient_id,
        )

        if patient is None:
            continue

        task_rows.append(
            NavigatorDashboardTaskResponse(
                task_id=task.id,
                patient_id=task.patient_id,
                patient_first_name=(
                    patient.first_name
                ),
                patient_last_name=(
                    patient.last_name
                ),
                title=task.title,
                status=task.status,
                due_at=task.due_at,
            )
        )

    attention_order = {
        AttentionStatus.NEEDS_ATTENTION: 0,
        AttentionStatus.FOLLOW_UP: 1,
        AttentionStatus.ON_TRACK: 2,
    }

    patient_rows.sort(
        key=lambda row: (
            attention_order[
                row.attention_status
            ],
            row.next_appointment_at
            is None,
            row.next_appointment_at,
            row.last_name,
            row.first_name,
        )
    )

    task_status_order = {
        NavigationTaskStatus.IN_PROGRESS: 0,
        NavigationTaskStatus.OPEN: 1,
    }

    task_rows.sort(
        key=lambda row: (
            task_status_order[row.status],
            row.due_at is None,
            row.due_at,
            row.patient_last_name,
        )
    )

    return NavigatorDashboardResponse(
        counts=(
            NavigatorDashboardCountsResponse(
                total_patients=len(patients),
                needs_attention=(
                    needs_attention_count
                ),
                follow_up=follow_up_count,
                on_track=on_track_count,
                open_tasks=open_task_count,
                in_progress_tasks=(
                    in_progress_task_count
                ),
            )
        ),
        patients=patient_rows,
        tasks=task_rows,
    )