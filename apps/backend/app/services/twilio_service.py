"""
Small Twilio Voice helper.

We only need three things from Twilio, so the REST API
is called directly with `requests` instead of adding the
Twilio SDK:

1. start an outbound call
2. build TwiML (the XML that tells Twilio what to say
   and when to listen)
3. check that webhook requests really come from Twilio
"""

import base64
import hashlib
import hmac
from xml.sax.saxutils import escape

import requests

from app.core.config import settings


class TwilioError(Exception):
    pass


def is_configured() -> bool:
    return bool(
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_from_number
    )


def public_url(path: str) -> str:
    return settings.public_api_url.rstrip("/") + path


def start_call(*, to_number: str, call_id: str) -> str:
    if not is_configured():
        raise TwilioError("Twilio is not configured.")

    url = (
        "https://api.twilio.com/2010-04-01/Accounts/"
        f"{settings.twilio_account_sid}/Calls.json"
    )

    data = [
        ("To", to_number),
        ("From", settings.twilio_from_number),
        ("Url", public_url(f"/voice/reminder-calls/{call_id}/answer")),
        ("Method", "POST"),
        ("StatusCallback", public_url(f"/voice/reminder-calls/{call_id}/status")),
        ("StatusCallbackMethod", "POST"),
        ("StatusCallbackEvent", "ringing"),
        ("StatusCallbackEvent", "answered"),
        ("StatusCallbackEvent", "completed"),
        # Ring for about 30 seconds before giving up.
        ("Timeout", "30"),
    ]

    try:
        response = requests.post(
            url,
            data=data,
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            timeout=15,
        )
    except requests.RequestException as exc:
        raise TwilioError("Could not reach Twilio.") from exc

    if response.status_code >= 300:
        try:
            message = response.json().get("message")
        except ValueError:
            message = None
        raise TwilioError(message or f"Twilio error {response.status_code}")

    return response.json()["sid"]


def validate_signature(url: str, params: dict[str, str], signature: str | None) -> bool:
    """https://www.twilio.com/docs/usage/webhooks/webhooks-security"""

    if not settings.twilio_auth_token or not signature:
        return False

    payload = url + "".join(f"{key}{params[key]}" for key in sorted(params))
    digest = hmac.new(
        settings.twilio_auth_token.encode(),
        payload.encode(),
        hashlib.sha1,
    ).digest()
    expected = base64.b64encode(digest).decode()
    return hmac.compare_digest(expected, signature)


# ---------------------------------------------------------
# TwiML
# ---------------------------------------------------------

_HINTS = {
    "yes_no": "yes, no, not sure",
    "identity": "yes, no, speaking, daughter, son, wife, husband, caregiver",
    "number": "zero, one, two, three, four, five, six, seven, eight, nine, ten",
    "free_text": "",
}


def _say(text: str) -> str:
    voice = escape(settings.twilio_voice)
    return f'<Say voice="{voice}" language="en-US">{escape(text)}</Say>'


def gather(*, say: str, call_id: str, expects: str) -> str:
    action = escape(public_url(f"/voice/reminder-calls/{call_id}/reply"))
    no_input = escape(public_url(f"/voice/reminder-calls/{call_id}/reply?silent=1"))

    # Keypad answers help people who find speaking to a
    # machine hard. Free text has no keypad option.
    input_type = "speech" if expects == "free_text" else "speech dtmf"
    num_digits = ' numDigits="2"' if expects == "number" else ' numDigits="1"'
    hints = _HINTS.get(expects, "")
    hints_attr = f' hints="{escape(hints)}"' if hints else ""
    timeout = "8" if expects == "free_text" else "6"

    return (
        '<?xml version="1.0" encoding="UTF-8"?><Response>'
        f'<Gather input="{input_type}" action="{action}" method="POST" '
        f'speechTimeout="auto" timeout="{timeout}" language="en-US" '
        f'actionOnEmptyResult="false"{num_digits}{hints_attr}>'
        f"{_say(say)}"
        "</Gather>"
        f'<Redirect method="POST">{no_input}</Redirect>'
        "</Response>"
    )


def hang_up(*, say: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?><Response>'
        f"{_say(say)}<Hangup/></Response>"
    )
