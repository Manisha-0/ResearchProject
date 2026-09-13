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

class JourneyItemType(str, Enum):
    APPOINTMENT = "appointment"
    TREATMENT = "treatment"
    REFERRAL = "referral"
    FOLLOW_UP = "follow_up"
    CARE_TASK = "care_task"
    DOCUMENT = "document"
    MILESTONE = "milestone"


class JourneyItemStatus(str, Enum):
    UPCOMING = "upcoming"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    MISSED = "missed"

class CheckInSource(str, Enum):
    PATIENT = "patient"
    CAREGIVER = "caregiver"


class NavigationSignalCategory(str, Enum):
    ACCESS = "access"
    CARE_COORDINATION = "care_coordination"
    PATIENT_REPORTED = "patient_reported"
    FINANCIAL = "financial"
    ENGAGEMENT = "engagement"
    SOCIAL_SUPPORT = "social_support"
    ADMINISTRATIVE = "administrative"
    SYSTEM = "system"


class NavigationSignalStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class NavigationSignalSourceType(str, Enum):
    CHECK_IN = "check_in"
    APPOINTMENT = "appointment"
    CARE_JOURNEY = "care_journey"
    CAREGIVER = "caregiver"
    SYSTEM = "system"

class NavigationNeedStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"


class AttentionStatus(str, Enum):
    NEEDS_ATTENTION = "needs_attention"
    FOLLOW_UP = "follow_up"
    ON_TRACK = "on_track"

class NavigationTaskStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"