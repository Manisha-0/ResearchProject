"""
Gemini fallback for understanding a spoken answer.

Only used when simple word matching in call_script.py
could not tell what the caller meant (for example
"my grandson usually drives me on Mondays"). The model
returns one value from a short allowed list; anything
else is treated as "unclear" and the question is asked
again.
"""

import logging

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.core.config import settings
from app.services import call_script

logger = logging.getLogger(__name__)


ALLOWED = {
    call_script.IDENTITY: ["patient", "caregiver", "wrong_person", "not_patient", "unclear"],
    call_script.SYMPTOMS: [str(n) for n in range(11)] + ["unclear"],
}
YES_NO = ["yes", "no", "unsure", "unclear"]


class _Interpretation(BaseModel):
    value: str


_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(
            api_key=settings.gemini_api_key,
            # Phone calls cannot wait long for an answer.
            http_options=types.HttpOptions(timeout=5000),
        )
    return _client


def interpret_answer(step: str, question: str, answer: str):
    allowed = ALLOWED.get(step, YES_NO)

    prompt = f"""
You help an automated appointment reminder call understand
one spoken answer. Speech-to-text may contain small errors.

Question the caller was asked:
"{question}"

What the caller said:
"{answer}"

Reply with exactly one value from this list: {", ".join(allowed)}

Rules:
- Pick "unclear" if the answer does not clearly match a value.
- Do not guess. Do not add medical judgement.
- For a 0-10 feeling scale, only return a number the caller
  actually said or clearly meant.
""".strip()

    response = _get_client().models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0,
            response_mime_type="application/json",
            response_schema=_Interpretation,
        ),
    )

    parsed = response.parsed
    value = (
        parsed.value if isinstance(parsed, _Interpretation)
        else _Interpretation.model_validate_json(response.text).value
    ).strip().lower()

    if value not in allowed:
        logger.info("Interpreter returned %r for step %s", value, step)
        return call_script.UNCLEAR

    if step == call_script.SYMPTOMS and value != call_script.UNCLEAR:
        return int(value)

    return value


def get_interpreter():
    if not settings.reminder_call_use_ai or not settings.gemini_api_key:
        return None
    return interpret_answer
