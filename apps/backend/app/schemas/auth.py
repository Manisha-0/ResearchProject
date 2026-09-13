import uuid

from pydantic import BaseModel, EmailStr

from app.models.enums import UserRole, UserStatus


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