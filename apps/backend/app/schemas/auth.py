import uuid

from pydantic import BaseModel, EmailStr
from app.models.enums import UserRole, UserStatus
from datetime import date

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    email: EmailStr
    role: UserRole
    status: UserStatus

class InvitationValidateRequest(BaseModel):
    token: str


class InvitationValidateResponse(BaseModel):
    valid: bool
    email: EmailStr
    role: UserRole


class AccountActivateRequest(BaseModel):
    token: str
    password: str


class AccountActivateResponse(BaseModel):
    message: str

class PatientActivationValidateRequest(
    BaseModel
):
    token: str
    date_of_birth: date


class PatientActivationValidateResponse(
    BaseModel
):
    valid: bool
    email: EmailStr
    first_name: str


class PatientActivateRequest(BaseModel):
    token: str
    date_of_birth: date
    password: str

class CaregiverActivationValidateRequest(
    BaseModel
):
    token: str


class CaregiverActivationValidateResponse(
    BaseModel
):
    valid: bool
    email: EmailStr
    first_name: str


class CaregiverActivateRequest(BaseModel):
    token: str
    password: str