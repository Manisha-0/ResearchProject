import json
import time

from typing import Any

from google import genai
from google.genai import (
    errors,
    types,
)

from pydantic import ValidationError

from app.core.config import settings

from app.schemas.copilot import (
    CopilotResponse,
    CopilotSourceResponse,
    GeminiCopilotOutput,
)


class CopilotServiceError(
    Exception
):
    pass


def _build_prompt(
    *,
    question: str,
    context_entries: list[
        dict[str, Any]
    ],
) -> str:
    serialized_context = (
        json.dumps(
            context_entries,
            indent=2,
            default=str,
        )
    )

    return f"""
You are Compass Copilot.

You assist a HUMAN cancer-care navigator
with care coordination and navigation.

You are NOT a doctor, clinician, clinical
decision-support system, or emergency
triage system.

The navigator asked:

{question}

You have been given a controlled snapshot
of this patient's Compass record below.

STRICT GROUNDING RULES

1. Use ONLY facts present in PATIENT CONTEXT.

2. Do not use outside medical knowledge to
   fill gaps.

3. Never invent:
   - diagnoses
   - appointments
   - providers
   - treatments
   - symptoms
   - transportation status
   - caregiver activity
   - navigation barriers
   - task completion
   - dates

4. Every factual statement about this patient
   must be supported by the supplied context.

5. If the context does not contain enough
   information to answer the question, say so
   clearly.

6. Never claim that something happened just
   because it would normally happen.

CLINICAL SAFETY RULES

7. Do not diagnose.

8. Do not recommend treatment, medication,
   dosage, or clinical management.

9. Do not decide whether the patient is
   clinically high risk.

10. Do not determine whether the patient needs
    emergency care.

11. Do not make or change Compass Attention
    Status.

12. Do not override, reinterpret, or second-
    guess Compass's rules engine.

13. If Attention Status appears in the context,
    you may REPORT the existing status and the
    recorded navigation factors supporting it,
    but you may not independently determine a
    different status.

NAVIGATION SCOPE

You MAY help with:

- appointments
- referrals
- transportation logistics
- care coordination
- support services
- communication follow-up
- medication ACCESS logistics
- caregiver-reported information
- care journey milestones
- unresolved navigation barriers
- navigator tasks
- document summaries
- preparing a navigator phone call
- summarizing recent patient activity

SOURCE RULES

Every context item has a source_id such as:

APPOINTMENT_1
CHECK_IN_1
NAVIGATION_NEED_1
TASK_1
DOCUMENT_SUMMARY_1

Return ONLY source IDs that directly support
your answer.

Never invent a source ID.

PATIENT CONTEXT

{serialized_context}
""".strip()


def _parse_response(
    response,
) -> GeminiCopilotOutput:
    try:
        if isinstance(
            response.parsed,
            GeminiCopilotOutput,
        ):
            return response.parsed

        if (
            response.parsed
            is not None
        ):
            return (
                GeminiCopilotOutput
                .model_validate(
                    response.parsed
                )
            )

        if response.text:
            return (
                GeminiCopilotOutput
                .model_validate_json(
                    response.text
                )
            )

        raise CopilotServiceError(
            "Gemini returned an empty "
            "Copilot response."
        )

    except CopilotServiceError:
        raise

    except (
        ValidationError,
        ValueError,
        TypeError,
    ) as exc:
        raise CopilotServiceError(
            "Gemini returned an invalid "
            "Copilot response."
        ) from exc


def _call_gemini(
    *,
    prompt: str,
) -> GeminiCopilotOutput:
    client = genai.Client(
        api_key=settings.gemini_api_key
    )

    max_attempts = 3

    for attempt in range(
        1,
        max_attempts + 1,
    ):
        try:
            response = (
                client.models
                .generate_content(
                    model=(
                        settings.gemini_model
                    ),
                    contents=prompt,
                    config=(
                        types
                        .GenerateContentConfig(
                            temperature=0.1,
                            response_mime_type=(
                                "application/json"
                            ),
                            response_schema=(
                                GeminiCopilotOutput
                            ),
                        )
                    ),
                )
            )

            return _parse_response(
                response
            )

        except errors.APIError as exc:
            if (
                exc.code == 503
                and attempt
                < max_attempts
            ):
                time.sleep(
                    2 ** (
                        attempt - 1
                    )
                )

                continue

            if exc.code == 503:
                raise (
                    CopilotServiceError(
                        "Compass Copilot is "
                        "temporarily unavailable "
                        "because the AI provider "
                        "is experiencing high "
                        "demand. Please try "
                        "again shortly."
                    )
                ) from exc

            if exc.code == 429:
                raise (
                    CopilotServiceError(
                        "Compass Copilot request "
                        "limit was reached. "
                        "Please try again "
                        "shortly."
                    )
                ) from exc

            if exc.code in (
                401,
                403,
            ):
                raise (
                    CopilotServiceError(
                        "Compass Copilot AI "
                        "configuration is not "
                        "authorized."
                    )
                ) from exc

            if exc.code == 404:
                raise (
                    CopilotServiceError(
                        "The configured Gemini "
                        "model is unavailable."
                    )
                ) from exc

            raise (
                CopilotServiceError(
                    "Compass Copilot could not "
                    "generate a response."
                )
            ) from exc

        except CopilotServiceError:
            raise

        except Exception as exc:
            raise (
                CopilotServiceError(
                    "Compass Copilot could not "
                    "generate a response."
                )
            ) from exc

    raise CopilotServiceError(
        "Compass Copilot did not "
        "return a response."
    )


def answer_copilot_question(
    *,
    question: str,
    context_entries: list[
        dict[str, Any]
    ],
    source_registry: dict[
        str,
        dict[str, str],
    ],
) -> CopilotResponse:
    if not context_entries:
        return CopilotResponse(
            answer=(
                "There is not enough patient "
                "information in Compass to "
                "answer that question."
            ),
            sources=[],
            model_name=(
                settings.gemini_model
            ),
        )

    prompt = _build_prompt(
        question=question,
        context_entries=context_entries,
    )

    generated = _call_gemini(
        prompt=prompt
    )

    validated_source_ids: list[
        str
    ] = []

    for source_id in (
        generated.used_source_ids
    ):
        if (
            source_id
            not in source_registry
        ):
            continue

        if (
            source_id
            in validated_source_ids
        ):
            continue

        validated_source_ids.append(
            source_id
        )

    sources = [
        CopilotSourceResponse(
            source_id=source_id,
            type=source_registry[
                source_id
            ]["type"],
            label=source_registry[
                source_id
            ]["label"],
        )
        for source_id
        in validated_source_ids
    ]

    return CopilotResponse(
        answer=generated.answer,
        sources=sources,
        model_name=(
            settings.gemini_model
        ),
    )