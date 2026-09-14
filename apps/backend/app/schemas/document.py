import uuid

from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    Field,
)


DocumentType = Literal[
    "referral",
    "care_plan",
    "discharge_instructions",
    "administrative",
    "other",
]


class DocumentResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID

    document_type: DocumentType

    original_filename: str

    content_type: str

    file_size_bytes: int

    uploaded_by_user_id: uuid.UUID

    patient_visible: bool

    created_at: datetime


class DocumentAccessResponse(BaseModel):
    url: str

    expires_in_seconds: int


class GeminiDocumentSummaryOutput(
    BaseModel
):
    summary: str = Field(
        min_length=1,
    )

    key_details: list[str]

    navigation_actions: list[str]

    important_dates: list[str]

    limitations: list[str]


class DocumentSummaryResponse(
    BaseModel
):
    id: uuid.UUID

    document_id: uuid.UUID

    patient_id: uuid.UUID

    model_name: str

    summary: str

    key_details: list[str]

    navigation_actions: list[str]

    important_dates: list[str]

    limitations: list[str]

    source_character_count: int

    source_truncated: bool

    generated_by_user_id: uuid.UUID

    created_at: datetime

    updated_at: datetime