import uuid

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


class CopilotContextError(
    Exception
):
    pass


MAX_ROWS_PER_SOURCE = 20


def _first_nonempty(
    data: dict[str, Any],
    keys: tuple[str, ...],
) -> str | None:
    for key in keys:
        value = data.get(key)

        if value is None:
            continue

        if isinstance(
            value,
            str,
        ):
            cleaned = value.strip()

            if cleaned:
                return cleaned

        elif isinstance(
            value,
            (
                int,
                float,
                bool,
            ),
        ):
            return str(value)

    return None


def _clean_record(
    data: dict[str, Any],
) -> dict[str, Any]:
    """
    Remove fields that add no useful
    navigation context or unnecessarily
    expose internal implementation data.
    """

    excluded_keys = {
        "password_hash",
        "hashed_password",
        "storage_path",
        "storage_bucket",
        "supabase_path",
        "jwt",
        "token",
        "secret",
    }

    return {
        key: value
        for key, value in data.items()
        if key not in excluded_keys
    }


def _fetch_rows(
    db: Session,
    *,
    table_name: str,
    patient_id: uuid.UUID,
    limit: int = MAX_ROWS_PER_SOURCE,
) -> list[dict[str, Any]]:
    """
    Fetch patient-scoped rows as JSONB.

    Table names come only from constants in
    this module and are never user supplied.
    """

    statement = text(
        f"""
        SELECT to_jsonb(record) AS data
        FROM (
            SELECT *
            FROM {table_name}
            WHERE patient_id = :patient_id
            LIMIT :limit
        ) AS record
        """
    )

    result = db.execute(
        statement,
        {
            "patient_id": patient_id,
            "limit": limit,
        },
    )

    records: list[
        dict[str, Any]
    ] = []

    for row in result:
        data = row.data

        if isinstance(
            data,
            dict,
        ):
            records.append(
                _clean_record(
                    data,
                )
            )

    return records


def _fetch_patient_profile(
    db: Session,
    *,
    patient_id: uuid.UUID,
) -> dict[str, Any] | None:
    result = db.execute(
        text(
            """
            SELECT to_jsonb(record) AS data
            FROM (
                SELECT *
                FROM patient_profiles
                WHERE id = :patient_id
                LIMIT 1
            ) AS record
            """
        ),
        {
            "patient_id": patient_id,
        },
    ).first()

    if not result:
        return None

    if not isinstance(
        result.data,
        dict,
    ):
        return None

    return _clean_record(
        result.data,
    )


def _fetch_document_summaries(
    db: Session,
    *,
    patient_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """
    Copilot consumes the already-generated
    structured summaries rather than sending
    every PDF back to Gemini.
    """

    result = db.execute(
        text(
            """
            SELECT jsonb_build_object(
                'document_id',
                    d.id,
                'document_type',
                    d.document_type,
                'original_filename',
                    d.original_filename,
                'patient_visible',
                    d.patient_visible,
                'summary',
                    ds.summary,
                'key_details',
                    ds.key_details,
                'navigation_actions',
                    ds.navigation_actions,
                'important_dates',
                    ds.important_dates,
                'limitations',
                    ds.limitations,
                'summary_updated_at',
                    ds.updated_at
            ) AS data
            FROM document_summaries ds
            INNER JOIN documents d
                ON d.id = ds.document_id
            WHERE
                ds.patient_id = :patient_id
                AND d.patient_id = :patient_id
            LIMIT :limit
            """
        ),
        {
            "patient_id": patient_id,
            "limit": MAX_ROWS_PER_SOURCE,
        },
    )

    records: list[
        dict[str, Any]
    ] = []

    for row in result:
        if isinstance(
            row.data,
            dict,
        ):
            records.append(
                _clean_record(
                    row.data,
                )
            )

    return records


def _label_for_record(
    source_type: str,
    data: dict[str, Any],
    index: int,
) -> str:
    if source_type == "patient":
        return (
            _first_nonempty(
                data,
                (
                    "display_name",
                    "full_name",
                    "name",
                ),
            )
            or "Patient profile"
        )

    if source_type == "appointment":
        value = _first_nonempty(
            data,
            (
                "title",
                "appointment_type",
                "type",
                "reason",
                "location",
            ),
        )

        return (
            f"Appointment: {value}"
            if value
            else f"Appointment {index}"
        )

    if source_type == "care_journey":
        value = _first_nonempty(
            data,
            (
                "title",
                "label",
                "name",
                "item_type",
                "type",
            ),
        )

        return (
            f"Care journey: {value}"
            if value
            else f"Care journey item {index}"
        )

    if source_type == "check_in":
        value = _first_nonempty(
            data,
            (
                "note_text",
                "note",
                "free_text",
                "submitted_by_role",
            ),
        )

        if value:
            shortened = value[:80]

            return (
                f"Check-in: {shortened}"
            )

        return f"Check-in {index}"

    if source_type == "navigation_need":
        value = _first_nonempty(
            data,
            (
                "title",
                "label",
                "need_type",
                "category",
                "type",
            ),
        )

        return (
            f"Navigation need: {value}"
            if value
            else f"Navigation need {index}"
        )

    if source_type == "navigation_task":
        value = _first_nonempty(
            data,
            (
                "title",
                "label",
                "task_type",
                "description",
            ),
        )

        return (
            f"Navigator task: {value}"
            if value
            else f"Navigator task {index}"
        )

    if source_type == "attention":
        value = _first_nonempty(
            data,
            (
                "attention_status",
                "status",
            ),
        )

        return (
            f"Compass attention status: "
            f"{value}"
            if value
            else "Compass attention snapshot"
        )

    if (
        source_type
        == "document_summary"
    ):
        value = _first_nonempty(
            data,
            (
                "original_filename",
                "document_type",
            ),
        )

        return (
            f"Document: {value}"
            if value
            else f"Document summary {index}"
        )

    return f"Source {index}"


def build_copilot_context(
    db: Session,
    *,
    patient_id: uuid.UUID,
) -> tuple[
    list[dict[str, Any]],
    dict[str, dict[str, str]],
]:
    """
    Returns:

    context_entries:
        Data sent to Gemini.

    source_registry:
        Server-controlled map used to validate
        Gemini citations before returning them
        to the frontend.
    """

    context_entries: list[
        dict[str, Any]
    ] = []

    source_registry: dict[
        str,
        dict[str, str],
    ] = {}

    counters: dict[
        str,
        int,
    ] = {}

    def add_entry(
        *,
        source_type: str,
        data: dict[str, Any],
    ) -> None:
        counters[source_type] = (
            counters.get(
                source_type,
                0,
            )
            + 1
        )

        index = counters[
            source_type
        ]

        prefix_map = {
            "patient": "PATIENT",
            "appointment": "APPOINTMENT",
            "care_journey": "CARE_JOURNEY",
            "check_in": "CHECK_IN",
            "navigation_need": "NAVIGATION_NEED",
            "navigation_task": "TASK",
            "attention": "ATTENTION",
            "document_summary": "DOCUMENT_SUMMARY",
        }

        prefix = prefix_map[
            source_type
        ]

        source_id = (
            f"{prefix}_{index}"
        )

        label = _label_for_record(
            source_type,
            data,
            index,
        )

        context_entries.append(
            {
                "source_id": source_id,
                "source_type": source_type,
                "label": label,
                "data": data,
            }
        )

        source_registry[
            source_id
        ] = {
            "type": source_type,
            "label": label,
        }

    profile = (
        _fetch_patient_profile(
            db,
            patient_id=patient_id,
        )
    )

    if profile:
        add_entry(
            source_type="patient",
            data=profile,
        )

    table_sources = (
        (
            "appointments",
            "appointment",
        ),
        (
            "care_journey_items",
            "care_journey",
        ),
        (
            "check_ins",
            "check_in",
        ),
        (
            "navigation_needs",
            "navigation_need",
        ),
        (
            "navigation_tasks",
            "navigation_task",
        ),
        (
            "attention_snapshots",
            "attention",
        ),
    )

    for (
        table_name,
        source_type,
    ) in table_sources:
        try:
            rows = _fetch_rows(
                db,
                table_name=table_name,
                patient_id=patient_id,
            )
        except Exception as exc:
            raise CopilotContextError(
                "Unable to assemble "
                f"Copilot context from "
                f"{table_name}."
            ) from exc

        for row in rows:
            add_entry(
                source_type=source_type,
                data=row,
            )

    try:
        summaries = (
            _fetch_document_summaries(
                db,
                patient_id=patient_id,
            )
        )
    except Exception as exc:
        raise CopilotContextError(
            "Unable to assemble "
            "document summary context."
        ) from exc

    for summary in summaries:
        add_entry(
            source_type=(
                "document_summary"
            ),
            data=summary,
        )

    return (
        context_entries,
        source_registry,
    )