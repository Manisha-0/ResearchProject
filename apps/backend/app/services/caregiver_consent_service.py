"""
Caregiver access approved on the patient's behalf.

Normally a patient approves a caregiver in the app. Many patients
Compass is built for will never log in, so a navigator can record
that the patient agreed by phone, in person or on a paper form.
The same rules apply as for in-app approval: the patient chooses
the permissions, the caregiver then gets an activation link, and
the consent (who agreed, how, and which navigator recorded it) is
stored on the access record and in the audit log.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.caregiver import (
    CaregiverPatientAccess,
    CaregiverPermission,
    CaregiverProfile,
)
from app.models.enums import (
    CaregiverAccessStatus,
    InvitationPurpose,
    UserStatus,
)
from app.models.user import User
from app.schemas.caregiver import CaregiverConsent
from app.services.audit_service import write_audit_log
from app.services.email_service import get_email_service
from app.services.invitation_service import create_invitation

CONSENT_LABELS = {
    "phone": "by phone",
    "in_person": "in person",
    "paper_form": "on a paper form",
}


@dataclass
class PendingInvite:
    """An activation email to send once the transaction is saved."""

    email: str
    first_name: str
    token: str


def apply_recorded_consent(
    db: Session,
    *,
    access: CaregiverPatientAccess,
    consent: CaregiverConsent,
    navigator: User,
) -> PendingInvite | None:
    if access.status != CaregiverAccessStatus.PENDING_PATIENT_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This caregiver request is no longer waiting for approval.",
        )

    caregiver_user = db.get(User, access.caregiver_user_id)
    caregiver_profile = db.scalar(
        select(CaregiverProfile).where(CaregiverProfile.user_id == access.caregiver_user_id)
    )
    if caregiver_user is None or caregiver_profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Caregiver account is invalid.",
        )

    db.execute(delete(CaregiverPermission).where(CaregiverPermission.caregiver_access_id == access.id))
    for permission in set(consent.permissions):
        db.add(CaregiverPermission(caregiver_access_id=access.id, permission=permission))

    access.approved_at = datetime.now(timezone.utc)
    access.consent_method = consent.method
    access.consent_given_by = consent.given_by.strip()
    access.consent_note = consent.note.strip() if consent.note else None
    access.consent_recorded_by_user_id = navigator.id

    invite: PendingInvite | None = None
    invitation_id = None
    if caregiver_user.status == UserStatus.ACTIVE:
        access.status = CaregiverAccessStatus.ACTIVE
    else:
        access.status = CaregiverAccessStatus.INVITED
        invitation, raw_token = create_invitation(
            db,
            user=caregiver_user,
            purpose=InvitationPurpose.CAREGIVER_ACTIVATION,
            created_by_user_id=navigator.id,
        )
        invitation_id = str(invitation.id)
        invite = PendingInvite(
            email=caregiver_user.email,
            first_name=caregiver_profile.first_name,
            token=raw_token,
        )

    write_audit_log(
        db,
        organization_id=navigator.organization_id,
        actor_user_id=navigator.id,
        patient_id=access.patient_id,
        action="CAREGIVER_ACCESS_APPROVED_BY_RECORDED_CONSENT",
        resource_type="caregiver_patient_access",
        resource_id=str(access.id),
        metadata_json={
            "consent_method": consent.method,
            "consent_given_by": access.consent_given_by,
            "permissions": [permission.value for permission in set(consent.permissions)],
            **({"invitation_id": invitation_id} if invitation_id else {}),
        },
    )
    db.flush()
    return invite


def send_invite(invite: PendingInvite | None) -> None:
    if invite is None:
        return
    get_email_service().send_account_invitation(
        email=invite.email,
        first_name=invite.first_name,
        activation_token=invite.token,
        activation_type="caregiver",
    )
