from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class DocumentCreate(BaseModel):
    organization_id: int
    patient_id: int
    uploaded_by: int | None = None
    document_type: str
    file_name: str
    file_url: str
    document_date: date | None = None


class DocumentUpdate(BaseModel):
    document_type: str | None = None
    file_name: str | None = None
    file_url: str | None = None
    document_date: date | None = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    patient_id: int
    uploaded_by: int | None
    document_type: str
    file_name: str
    file_url: str
    document_date: date | None
    created_at: datetime