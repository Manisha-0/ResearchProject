import uuid

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)

from app.models.enums import (
    CaregiverAccessStatus,
    CaregiverPermissionType,
)


class CaregiverInitiateRequest(BaseModel):
    first_name: str = Field(
        min_length=1,
        max_length=100,
    )
    last_name: str = Field(
        min_length=1,
        max_length=100,
    )
    email: EmailStr
    relationship: str = Field(
        min_length=1,
        max_length=100,
    )
    phone: str | None = Field(
        default=None,
        max_length=30,
    )


class CaregiverInitiateResponse(BaseModel):
    caregiver_user_id: uuid.UUID
    caregiver_access_id: uuid.UUID
    email: EmailStr
    relationship_status: CaregiverAccessStatus
    message: str


class CaregiverAccessSummaryResponse(BaseModel):
    caregiver_access_id: uuid.UUID
    caregiver_user_id: uuid.UUID
    caregiver_name: str
    email: EmailStr
    relationship: str
    status: CaregiverAccessStatus
    permissions: list[
        CaregiverPermissionType
    ]


class CaregiverApprovalRequest(BaseModel):
    permissions: list[
        CaregiverPermissionType
    ] = Field(
        min_length=1,
    )


class CaregiverApprovalResponse(BaseModel):
    caregiver_access_id: uuid.UUID
    status: CaregiverAccessStatus
    permissions: list[
        CaregiverPermissionType
    ]
    message: str


class PatientCaregiverCreateRequest(
    BaseModel
):
    first_name: str = Field(
        min_length=1,
        max_length=100,
    )
    last_name: str = Field(
        min_length=1,
        max_length=100,
    )
    email: EmailStr
    relationship: str = Field(
        min_length=1,
        max_length=100,
    )
    phone: str | None = Field(
        default=None,
        max_length=30,
    )
    permissions: list[
        CaregiverPermissionType
    ] = Field(
        min_length=1,
    )


class CaregiverPermissionUpdateRequest(
    BaseModel
):
    permissions: list[
        CaregiverPermissionType
    ] = Field(
        min_length=1,
    )


class CaregiverPermissionUpdateResponse(
    BaseModel
):
    caregiver_access_id: uuid.UUID
    permissions: list[
        CaregiverPermissionType
    ]
    message: str


class CaregiverRevokeResponse(BaseModel):
    caregiver_access_id: uuid.UUID
    status: CaregiverAccessStatus
    message: str