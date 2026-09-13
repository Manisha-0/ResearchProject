from abc import (
    ABC,
    abstractmethod,
)

from typing import Literal

from app.core.config import settings


ActivationType = Literal[
    "navigator",
    "patient",
    "caregiver",
]


class EmailService(ABC):
    @abstractmethod
    def send_account_invitation(
        self,
        *,
        email: str,
        first_name: str,
        activation_token: str,
        activation_type: ActivationType = (
            "navigator"
        ),
    ) -> None:
        raise NotImplementedError


class ConsoleEmailService(
    EmailService
):
    def send_account_invitation(
        self,
        *,
        email: str,
        first_name: str,
        activation_token: str,
        activation_type: ActivationType = (
            "navigator"
        ),
    ) -> None:
        activation_link = (
            f"{settings.activation_url}"
            f"?token={activation_token}"
            f"&type={activation_type}"
        )

        print()
        print("=" * 70)
        print("[DEV EMAIL]")
        print(
            f"To: {email}"
        )
        print()
        print(
            f"Hello {first_name},"
        )
        print()
        print(
            "You have been invited to activate "
            "your Project Compass account."
        )
        print()
        print(
            "Activation link:"
        )
        print(
            activation_link
        )
        print()
        print(
            f"This invitation expires in "
            f"{settings.account_invitation_expire_hours} "
            f"hours."
        )
        print("=" * 70)
        print()


def get_email_service() -> EmailService:
    if (
        settings.email_provider
        == "console"
    ):
        return (
            ConsoleEmailService()
        )

    raise RuntimeError(
        f"Unsupported email provider: "
        f"{settings.email_provider}"
    )