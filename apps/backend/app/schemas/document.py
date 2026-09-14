import uuid

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


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