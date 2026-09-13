from enum import Enum


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    NAVIGATOR = "navigator"
    PATIENT = "patient"
    CAREGIVER = "caregiver"


class UserStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DISABLED = "disabled"


class InvitationPurpose(str, Enum):
    NAVIGATOR_ACTIVATION = "navigator_activation"
    PATIENT_ACTIVATION = "patient_activation"
    CAREGIVER_ACTIVATION = "caregiver_activation"
    PASSWORD_RESET = "password_reset"


class CaregiverAccessStatus(str, Enum):
    PENDING_PATIENT_APPROVAL = "pending_patient_approval"
    INVITED = "invited"
    ACTIVE = "active"
    REVOKED = "revoked"


class CaregiverPermissionType(str, Enum):
    APPOINTMENTS = "appointments"
    TRANSPORTATION = "transportation"
    CARE_TASKS = "care_tasks"
    PROXY_CHECK_IN = "proxy_check_in"
    DOCUMENTS = "documents"