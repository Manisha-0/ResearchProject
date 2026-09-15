import html
import logging
from urllib.parse import urlencode

import resend

from app.core.config import settings


logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    """Raised when an email cannot be delivered."""


class EmailService:
    """
    Project Compass email service.

    Supported providers:
    - console
    - resend
    """

    def __init__(self) -> None:
        self.provider = (
            settings.email_provider
            .strip()
            .lower()
        )

    def send_account_invitation(
        self,
        *,
        email: str,
        first_name: str,
        activation_token: str,
        activation_type: str = "navigator",
    ) -> str | None:
        """
        Send an account activation invitation.

        activation_type:
        - navigator
        - patient
        - caregiver
        """

        normalized_type = (
            activation_type
            .strip()
            .lower()
        )

        if normalized_type not in {
            "navigator",
            "patient",
            "caregiver",
        }:
            raise EmailDeliveryError(
                "Unsupported activation type."
            )

        activation_url = (
            self._build_activation_url(
                activation_token=(
                    activation_token
                ),
                activation_type=(
                    normalized_type
                ),
            )
        )

        return self._send_invitation_email(
            recipient_email=email,
            recipient_name=first_name,
            activation_url=activation_url,
            invitation_type=normalized_type,
        )

    def _build_activation_url(
        self,
        *,
        activation_token: str,
        activation_type: str,
    ) -> str:
        """
        Build the URL consumed by the existing
        Compass /activate frontend page.
    
        All account types include an explicit
        type because the frontend uses it to
        select the correct activation API.
        """
    
        query = {
            "token": activation_token,
            "type": activation_type,
        }
    
        separator = (
            "&"
            if "?" in settings.activation_url
            else "?"
        )
    
        return (
            f"{settings.activation_url}"
            f"{separator}"
            f"{urlencode(query)}"
        )

    def _send_invitation_email(
        self,
        *,
        recipient_email: str,
        recipient_name: str,
        activation_url: str,
        invitation_type: str,
    ) -> str | None:
        if self.provider == "console":
            return self._send_console(
                recipient_email=(
                    recipient_email
                ),
                recipient_name=(
                    recipient_name
                ),
                activation_url=(
                    activation_url
                ),
                invitation_type=(
                    invitation_type
                ),
            )

        if self.provider == "resend":
            return self._send_resend(
                recipient_email=(
                    recipient_email
                ),
                recipient_name=(
                    recipient_name
                ),
                activation_url=(
                    activation_url
                ),
                invitation_type=(
                    invitation_type
                ),
            )

        raise EmailDeliveryError(
            "Unsupported email provider "
            f"'{self.provider}'."
        )

    def _send_console(
        self,
        *,
        recipient_email: str,
        recipient_name: str,
        activation_url: str,
        invitation_type: str,
    ) -> None:
        logger.info(
            "\n"
            "========================================\n"
            "COMPASS INVITATION EMAIL\n"
            "========================================\n"
            "Recipient: %s <%s>\n"
            "Account type: %s\n"
            "Activation URL: %s\n"
            "========================================",
            recipient_name,
            recipient_email,
            invitation_type,
            activation_url,
        )

        return None

    def _send_resend(
        self,
        *,
        recipient_email: str,
        recipient_name: str,
        activation_url: str,
        invitation_type: str,
    ) -> str | None:
        if not settings.resend_api_key:
            raise EmailDeliveryError(
                "RESEND_API_KEY is not configured."
            )

        if not settings.resend_from_email:
            raise EmailDeliveryError(
                "RESEND_FROM_EMAIL is not configured."
            )

        resend.api_key = (
            settings.resend_api_key
        )

        subject = (
            "Activate your Project Compass account"
        )

        html_body = (
            self._build_html_body(
                recipient_name=(
                    recipient_name
                ),
                activation_url=(
                    activation_url
                ),
                invitation_type=(
                    invitation_type
                ),
            )
        )

        text_body = (
            self._build_text_body(
                recipient_name=(
                    recipient_name
                ),
                activation_url=(
                    activation_url
                ),
                invitation_type=(
                    invitation_type
                ),
            )
        )

        try:
            params: resend.Emails.SendParams = {
                "from": (
                    settings.resend_from_email
                ),
                "to": [
                    recipient_email
                ],
                "subject": subject,
                "html": html_body,
                "text": text_body,
            }

            response = (
                resend.Emails.send(
                    params
                )
            )

        except Exception as exc:
            logger.exception(
                "Failed to send Compass "
                "invitation email to %s.",
                recipient_email,
            )

            raise EmailDeliveryError(
                "Unable to send invitation email."
            ) from exc

        email_id = getattr(
            response,
            "id",
            None,
        )

        if (
            email_id is None
            and isinstance(
                response,
                dict,
            )
        ):
            email_id = (
                response.get("id")
            )

        logger.info(
            "Compass invitation email sent "
            "to %s. Resend email ID: %s",
            recipient_email,
            email_id,
        )

        return (
            str(email_id)
            if email_id
            else None
        )

    def _build_html_body(
        self,
        *,
        recipient_name: str,
        activation_url: str,
        invitation_type: str,
    ) -> str:
        safe_name = html.escape(
            recipient_name
        )

        safe_activation_url = (
            html.escape(
                activation_url,
                quote=True,
            )
        )

        safe_type = html.escape(
            invitation_type.capitalize()
        )

        expiration_hours = (
            settings
            .account_invitation_expire_hours
        )

        return f"""
<!doctype html>
<html>
  <body
    style="
      margin: 0;
      padding: 0;
      background: #f6f7f9;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color: #1f2937;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      style="
        width: 100%;
        background: #f6f7f9;
        padding: 32px 16px;
      "
    >
      <tr>
        <td align="center">

          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            style="
              max-width: 600px;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              border: 1px solid #e5e7eb;
            "
          >

            <tr>
              <td
                style="
                  background: #12304a;
                  padding: 30px 32px;
                "
              >
                <div
                  style="
                    color: #d9b65d;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 1.3px;
                    text-transform: uppercase;
                  "
                >
                  Project Compass
                </div>

                <div
                  style="
                    margin-top: 8px;
                    color: #ffffff;
                    font-size: 25px;
                    font-weight: 700;
                  "
                >
                  Welcome to Compass
                </div>

                <div
                  style="
                    margin-top: 8px;
                    color: #dbe5ec;
                    font-size: 14px;
                    line-height: 1.5;
                  "
                >
                  Cancer care navigation support
                </div>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding: 32px;
                "
              >

                <p
                  style="
                    margin: 0 0 18px;
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Hello {safe_name},
                </p>

                <p
                  style="
                    margin: 0 0 18px;
                    color: #4b5563;
                    font-size: 15px;
                    line-height: 1.7;
                  "
                >
                  You have been invited to
                  Project Compass as a
                  <strong>
                    {safe_type}
                  </strong>.
                </p>

                <p
                  style="
                    margin: 0 0 26px;
                    color: #4b5563;
                    font-size: 15px;
                    line-height: 1.7;
                  "
                >
                  Activate your account to
                  securely access Compass.
                </p>

                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                >
                  <tr>
                    <td
                      style="
                        border-radius: 10px;
                        background: #12304a;
                      "
                    >
                      <a
                        href="{safe_activation_url}"
                        style="
                          display: inline-block;
                          padding: 14px 24px;
                          color: #ffffff;
                          text-decoration: none;
                          font-size: 14px;
                          font-weight: 700;
                        "
                      >
                        Activate account
                      </a>
                    </td>
                  </tr>
                </table>

                <p
                  style="
                    margin: 28px 0 0;
                    color: #6b7280;
                    font-size: 13px;
                    line-height: 1.6;
                  "
                >
                  For your security, this
                  invitation expires in
                  {expiration_hours} hours.
                </p>

                <div
                  style="
                    margin-top: 26px;
                    padding-top: 22px;
                    border-top:
                      1px solid #e5e7eb;
                  "
                >
                  <p
                    style="
                      margin: 0;
                      color: #9ca3af;
                      font-size: 12px;
                      line-height: 1.6;
                    "
                  >
                    If you were not expecting
                    this invitation, you can
                    safely ignore this email.
                  </p>
                </div>

              </td>
            </tr>

          </table>

          <p
            style="
              margin: 18px 0 0;
              color: #9ca3af;
              font-size: 11px;
            "
          >
            Project Compass demonstration
            environment
          </p>

        </td>
      </tr>
    </table>
  </body>
</html>
"""

    def _build_text_body(
        self,
        *,
        recipient_name: str,
        activation_url: str,
        invitation_type: str,
    ) -> str:
        return (
            f"Hello {recipient_name},\n\n"
            "You have been invited to "
            "Compass as a "
            f"{invitation_type}.\n\n"
            "Activate your account here:\n"
            f"{activation_url}\n\n"
            "This invitation expires in "
            f"{settings.account_invitation_expire_hours} "
            "hours.\n\n"
            "If you were not expecting this "
            "invitation, you can safely ignore "
            "this email.\n\n"
            "Project Compass"
        )


_email_service: EmailService | None = None


def get_email_service() -> EmailService:
    global _email_service

    if _email_service is None:
        _email_service = EmailService()

    return _email_service