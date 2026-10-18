"""
Agent caller.

Instead of reading a fixed list of questions, a language
model holds the conversation. It decides what to ask next
and acts only through four tools:

    confirm_identity   who is on the line
    save_answer        record one checklist answer
    request_human      the caller wants a person
    end_call           finish the call

Every tool call is checked here before it changes anything.
The guard rails are in this file, not in the prompt:

* Emergencies are caught by fixed word rules before the
  model sees the caller's words (call_script.handle_emergency).
* Until the caller's identity is confirmed, the model is not
  given any appointment details, so it cannot leak them.
* Answers must be one of a few allowed values.
* The model cannot end the call while checklist items are
  missing, unless the caller declined or was handed over.
* If the model fails, the call falls back to the scripted
  caller at the first unanswered question.

Answers are stored in exactly the same shape as the scripted
caller's, so check-ins, summaries and the evaluation treat
both callers the same way.

The model is passed in (see GeminiAgentModel at the bottom),
so tests can use a fake one with no network.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Protocol

from app.services import call_script as cs

logger = logging.getLogger(__name__)


CHECKLIST = [
    "attendance",
    "transportation",
    "medication",
    "symptom_severity",
    "cost",
    "notes",
    "callback",
]

CHECKLIST_LABELS = {
    "attendance": "can they come to the appointment (yes / no / unsure)",
    "transportation": "do they have a ride (yes / no / unsure)",
    "medication": "any trouble getting medicines (yes = trouble / no)",
    "symptom_severity": "how they feel today, 0 (fine) to 10 (very bad)",
    "cost": "worried about cost or insurance (yes / no)",
    "notes": "anything else the care team should know (free text, or none)",
    "callback": "would they like a navigator to call back (yes / no)",
}

YES_NO_UNSURE = {"yes", "no", "unsure"}
YES_NO = {"yes", "no"}

ALLOWED_VALUES: dict[str, set[str]] = {
    "attendance": YES_NO_UNSURE,
    "transportation": YES_NO_UNSURE,
    "medication": YES_NO,
    "cost": YES_NO,
    "callback": YES_NO,
}

TOPICS = {"symptoms", "medicine", "ride", "cost_insurance", "appointment", "other"}
URGENCIES = {"urgent", "today", "routine"}
END_REASONS = {"completed", "caller_declined", "caller_unavailable"}

MAX_TOOL_ROUNDS = 3
MAX_CALLER_TURNS = 24
# Twilio waits about 15 seconds for each reply. Do not start
# another model round after this many seconds.
ROUND_BUDGET_SECONDS = 6.0
AGENT_EXPECTS = "agent"


# ---------------------------------------------------------
# Model interface
# ---------------------------------------------------------


@dataclass
class ToolCall:
    name: str
    args: dict[str, Any]


@dataclass
class ModelReply:
    text: str | None
    calls: list[ToolCall] = field(default_factory=list)
    # The provider's own record of the reply, kept so it can
    # be sent back unchanged on the next turn.
    raw: dict | None = None


class AgentModel(Protocol):
    def generate(self, system_prompt: str, history: list[dict]) -> ModelReply: ...


# History is plain JSON so it can live in a JSONB column:
#   {"role": "user",  "text": "..."}
#   {"role": "model", "text": "...", "calls": [...], "raw": {...}}
#   {"role": "tool",  "results": [{"name": ..., "response": {...}}]}


@dataclass
class NavigatorInfo:
    first_name: str
    phone: str | None
    can_transfer: bool  # phone on file and clinic is open


@dataclass
class AgentResult:
    turn: cs.Turn
    history: list[dict]
    fell_back: bool = False
    error: str | None = None


# ---------------------------------------------------------
# Prompt
# ---------------------------------------------------------


def build_system_prompt(
    state: cs.CallState,
    ctx: cs.CallContext,
    navigator: NavigatorInfo | None,
) -> str:
    name = ctx.patient_first_name
    lines = [
        f"You are a friendly automated phone caller for {ctx.organization_name}.",
        f"You are calling {name}, a cancer patient, to remind them of an upcoming appointment",
        "and to check whether anything could stop them from coming.",
        "",
        "How to speak:",
        "- This is a phone call. Reply with what you will say out loud: plain text, no lists, no symbols.",
        "- Use short, simple sentences. Many callers are older or do not read well.",
        "- Ask one question at a time. Keep each reply under 40 words.",
        "- Be warm and patient. If an answer is unclear, ask again more simply.",
        "- Callers may press keys: 1 means yes, 2 means no, a number key is a 0-10 score.",
        "- Never give medical advice, never diagnose, never promise anything you cannot do with a tool.",
        "",
    ]

    if state.answered_by not in ("patient", "caregiver"):
        lines += [
            "Right now you do not know who answered the phone.",
            f"Find out if you are speaking with {name} or with someone who helps {name}.",
            "As soon as it is clear, call confirm_identity.",
            "If it is someone else who does not help the patient, call confirm_identity with wrong_person.",
            "Do not talk about appointments, health or anything private until identity is confirmed.",
            "If they ask for a real person, say you can arrange that and first need to know who you are speaking with.",
        ]
        return "\n".join(lines)

    who = (
        f"You are speaking with {name} directly."
        if state.answered_by == "patient"
        else f"You are speaking with someone who helps {name}. Talk about {name} by name, not 'you'."
    )
    with_provider = f" with {ctx.provider_name}" if ctx.provider_name else ""
    place = f" at {ctx.appointment_place}" if ctx.appointment_place else ""

    lines += [
        who,
        f"Appointment: {ctx.appointment_kind}{with_provider} {ctx.appointment_when}{place}.",
        "Remind them of this appointment early in the call.",
        "",
        "Checklist. Cover every item, in a natural order. Save each answer with save_answer as soon as it is clear.",
        "If the caller cannot or will not answer an item after you tried, save it with value unknown.",
    ]
    for key in CHECKLIST:
        status = "DONE" if key in state.answers else "still needed"
        lines.append(f"- {key}: {CHECKLIST_LABELS[key]} [{status}]")

    lines += [""]
    if navigator:
        if navigator.can_transfer:
            lines.append(
                f"Their navigator is {navigator.first_name}. If the caller asks for a person, "
                f"call request_human; the call will be connected to {navigator.first_name} right away."
            )
        else:
            lines.append(
                f"Their navigator is {navigator.first_name}, who cannot take a live call now. If the caller "
                "asks for a person, call request_human to book a call back."
            )
    else:
        lines.append(
            "If the caller asks for a person, call request_human to book a call back from the care team."
        )

    lines += [
        "When every checklist item is DONE, thank them and call end_call with reason completed.",
        "If the caller wants to stop early, call end_call with reason caller_declined.",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------
# Tools
# ---------------------------------------------------------


def _missing(state: cs.CallState) -> list[str]:
    return [key for key in CHECKLIST if key not in state.answers]


def _apply_tool(
    state: cs.CallState,
    call: ToolCall,
    navigator: NavigatorInfo | None,
) -> tuple[dict, str | None]:
    """
    Check and run one tool call.

    Returns (response for the model, outcome). The outcome is
    None to keep talking, or one of "wrong_person",
    "transfer", "end".
    """

    args = call.args or {}
    identified = state.answered_by in ("patient", "caregiver")

    if call.name == "confirm_identity":
        who = str(args.get("answered_by", "")).strip().lower()
        if who not in ("patient", "caregiver", "wrong_person"):
            return {"error": "answered_by must be patient, caregiver or wrong_person"}, None
        if who == "wrong_person":
            state.answered_by = "wrong_person"
            return {"ok": True}, "wrong_person"
        state.answered_by = who
        return {"ok": True, "next": "Remind them of the appointment, then go through the checklist."}, None

    if not identified:
        return {"error": "Confirm who you are speaking with first (confirm_identity)."}, None

    if call.name == "save_answer":
        key = str(args.get("field", "")).strip()
        raw = args.get("value")
        if key not in CHECKLIST:
            return {"error": f"Unknown field. Use one of: {', '.join(CHECKLIST)}"}, None

        value: Any = str(raw).strip().lower() if raw is not None else ""

        if value in ("unknown", "declined", ""):
            state.answers[key] = None
        elif key == "symptom_severity":
            try:
                number = int(float(value))
            except ValueError:
                return {"error": "symptom_severity must be a whole number 0-10, or unknown"}, None
            if not 0 <= number <= 10:
                return {"error": "symptom_severity must be between 0 and 10"}, None
            state.answers[key] = number
        elif key == "notes":
            text = str(raw).strip()
            state.answers[key] = None if text.lower() in ("none", "no", "nothing") else text[:500]
        else:
            allowed = ALLOWED_VALUES[key]
            if value not in allowed:
                return {"error": f"{key} must be one of: {', '.join(sorted(allowed))}, or unknown"}, None
            state.answers[key] = value

        return {"ok": True, "still_needed": _missing(state)}, None

    if call.name == "request_human":
        topic = str(args.get("topic", "other")).strip().lower()
        urgency = str(args.get("urgency", "routine")).strip().lower()
        reason = str(args.get("reason", "")).strip()[:300] or "Caller asked to speak with a person."
        topic = topic if topic in TOPICS else "other"
        urgency = urgency if urgency in URGENCIES else "routine"

        state.callback = {"topic": topic, "reason": reason, "urgency": urgency}
        state.answers["callback"] = "yes"

        if navigator and navigator.can_transfer and navigator.phone:
            return {"ok": True, "status": "transferring"}, "transfer"

        who = navigator.first_name if navigator else "Someone from the care team"
        when = "today" if urgency in ("urgent", "today") else "soon"
        return {
            "ok": True,
            "status": "callback_booked",
            "tell_caller": f"{who} will call back {when}.",
            "then": "Ask if they are willing to answer the few remaining questions. "
            "If not, end the call with reason caller_declined.",
            "still_needed": _missing(state),
        }, None

    if call.name == "end_call":
        reason = str(args.get("reason", "")).strip().lower()
        if reason not in END_REASONS:
            return {"error": f"reason must be one of: {', '.join(sorted(END_REASONS))}"}, None
        missing = _missing(state)
        if reason == "completed" and missing:
            return {"error": f"Not finished. Still needed: {', '.join(missing)}"}, None
        if reason != "completed":
            state.ended_early = True
        return {"ok": True}, "end"

    return {"error": f"Unknown tool {call.name}"}, None


# ---------------------------------------------------------
# Conversation
# ---------------------------------------------------------


def agent_opening(ctx: cs.CallContext) -> tuple[cs.Turn, list[dict]]:
    """
    The greeting is fixed, not generated, so every call starts
    by asking who is on the line before anything else.
    """

    turn = cs.opening(ctx)
    return (
        cs.Turn(say=turn.say, step="agent", expects=AGENT_EXPECTS),
        [{"role": "model", "text": turn.say, "calls": []}],
    )


def agent_turn(
    state: cs.CallState,
    ctx: cs.CallContext,
    caller_text: str,
    history: list[dict],
    *,
    model: AgentModel,
    navigator: NavigatorInfo | None = None,
    digits: str | None = None,
    time_budget: float | None = ROUND_BUDGET_SECONDS,
) -> AgentResult:
    history = list(history)
    text = (caller_text or "").strip()

    # 1. Emergencies never reach the model.
    emergency = cs.handle_emergency(state, text)
    if emergency:
        history.append({"role": "user", "text": text})
        history.append({"role": "model", "text": emergency.say, "calls": []})
        return AgentResult(turn=emergency, history=history)

    heard = text or (f"(pressed {digits})" if digits else "(silence, no answer)")
    if text and digits:
        heard = f"{text} (pressed {digits})"
    history.append({"role": "user", "text": heard})

    caller_turns = sum(1 for h in history if h["role"] == "user")
    if caller_turns > MAX_CALLER_TURNS:
        state.ended_early = True
        state.step = cs.DONE
        say = cs.closing(state, ctx)
        history.append({"role": "model", "text": say, "calls": []})
        return AgentResult(turn=cs.Turn(say=say, step=cs.DONE, done=True), history=history)

    # 2. Let the model talk and act, a few rounds at most.
    started = time.monotonic()
    try:
        for round_number in range(MAX_TOOL_ROUNDS + 1):
            if round_number and time_budget and time.monotonic() - started > time_budget:                raise TimeoutError("Agent took too long for a live call.")
            reply = model.generate(build_system_prompt(state, ctx, navigator), history)
            history.append({
                "role": "model",
                "text": reply.text,
                "calls": [{"name": c.name, "args": c.args} for c in reply.calls],
                "raw": reply.raw,
            })

            if not reply.calls:
                say = (reply.text or "").strip()
                if not say:
                    raise ValueError("Model returned nothing to say.")
                return AgentResult(
                    turn=cs.Turn(say=say, step="agent", expects=AGENT_EXPECTS),
                    history=history,
                )

            results = []
            outcome = None
            for call in reply.calls:
                response, result = _apply_tool(state, call, navigator)
                results.append({"name": call.name, "response": response})
                outcome = outcome or result
            history.append({"role": "tool", "results": results})

            if outcome == "wrong_person":
                state.ended_early = True
                state.step = cs.DONE
                say = cs.WRONG_PERSON_MESSAGE
                history.append({"role": "model", "text": say, "calls": []})
                return AgentResult(turn=cs.Turn(say=say, step=cs.DONE, done=True), history=history)

            if outcome == "transfer":
                state.step = cs.DONE
                if _missing(state):
                    state.ended_early = True
                say = (
                    f"Okay. I am connecting you to {navigator.first_name} now. "
                    "Please stay on the line."
                )
                history.append({"role": "model", "text": say, "calls": []})
                return AgentResult(
                    turn=cs.Turn(say=say, step=cs.DONE, done=True, transfer_to=navigator.phone),
                    history=history,
                )

            if outcome == "end":
                state.step = cs.DONE
                say = cs.closing(state, ctx)
                history.append({"role": "model", "text": say, "calls": []})
                return AgentResult(turn=cs.Turn(say=say, step=cs.DONE, done=True), history=history)

        raise ValueError("Model used too many tool rounds without speaking.")

    except Exception as exc:  # noqa: BLE001 - any model failure falls back
        reason = f"{type(exc).__name__}: {exc}"[:400]
        logger.warning("Agent caller failed, falling back to the script: %s", reason)
        result = _fall_back_to_script(state, ctx, history)
        result.error = reason
        return result


def _fall_back_to_script(
    state: cs.CallState,
    ctx: cs.CallContext,
    history: list[dict],
) -> AgentResult:
    """Carry on with the fixed questions from where the agent stopped."""

    state.reprompts = 0
    if state.answered_by not in ("patient", "caregiver"):
        state.step = cs.IDENTITY
        turn = cs.reprompt_for(cs.IDENTITY, state, ctx)
    else:
        remaining = [q for q in cs.QUESTION_ORDER if q not in state.answers]
        if not remaining:
            state.step = cs.DONE
            turn = cs.Turn(say=cs.closing(state, ctx), step=cs.DONE, done=True)
        else:
            state.step = remaining[0]
            turn = cs.prompt_for(remaining[0], state, ctx)

    history.append({"role": "model", "text": turn.say, "calls": [], "fallback": True})
    return AgentResult(turn=turn, history=history, fell_back=True)


# ---------------------------------------------------------
# Gemini
# ---------------------------------------------------------


TOOL_SCHEMAS = [
    {
        "name": "confirm_identity",
        "description": "Record who answered the phone.",
        "parameters": {
            "type": "object",
            "properties": {
                "answered_by": {
                    "type": "string",
                    "enum": ["patient", "caregiver", "wrong_person"],
                    "description": "patient = the patient; caregiver = family or someone who helps them; "
                    "wrong_person = anyone else.",
                }
            },
            "required": ["answered_by"],
        },
    },
    {
        "name": "save_answer",
        "description": "Save one checklist answer as soon as it is clear.",
        "parameters": {
            "type": "object",
            "properties": {
                "field": {"type": "string", "enum": CHECKLIST},
                "value": {
                    "type": "string",
                    "description": "yes / no / unsure for yes-no items, a number 0-10 for "
                    "symptom_severity, free text for notes (or none). Use unknown if the "
                    "caller could not answer.",
                },
            },
            "required": ["field", "value"],
        },
    },
    {
        "name": "request_human",
        "description": "The caller wants to talk to a person (navigator, nurse, someone real).",
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "enum": sorted(TOPICS)},
                "urgency": {
                    "type": "string",
                    "enum": ["urgent", "today", "routine"],
                    "description": "urgent = feeling very unwell or cannot get to treatment soon; "
                    "today = needs help before the appointment; routine = anything else.",
                },
                "reason": {"type": "string", "description": "One short sentence in the caller's words."},
            },
            "required": ["topic", "urgency", "reason"],
        },
    },
    {
        "name": "end_call",
        "description": "Finish the call.",
        "parameters": {
            "type": "object",
            "properties": {"reason": {"type": "string", "enum": sorted(END_REASONS)}},
            "required": ["reason"],
        },
    },
]


class GeminiAgentModel:
    def __init__(self, *, api_key: str, model_name: str, timeout_ms: int = 12000):
        from google import genai
        from google.genai import types

        self._types = types
        self._model_name = model_name
        self._client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=timeout_ms),
        )
        self._tools = [
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name=t["name"],
                        description=t["description"],
                        parameters_json_schema=t["parameters"],
                    )
                    for t in TOOL_SCHEMAS
                ]
            )
        ]

    def to_contents(self, history: list[dict]) -> list:
        types = self._types
        contents: list = []

        def add(role: str, parts: list) -> None:
            # Merge neighbours with the same role into one turn.
            if contents and contents[-1].role == role:
                contents[-1].parts.extend(parts)
            else:
                contents.append(types.Content(role=role, parts=parts))
                # Gemini expects a conversation to start with the user.
        # Our calls start with the agent's greeting, so open with
        # a short note that the phone was answered.
        if history and history[0]["role"] != "user":
            add("user", [types.Part(text="(The phone call has connected. You speak first.)")])

        for entry in history:
            role = entry["role"]
            if role == "user":
                add("user", [types.Part(text=entry["text"])])
            elif role == "model":
                if entry.get("raw"):
                    # Sent back exactly as received, including any
                    # thought signatures the model needs.
                    raw = types.Content.model_validate(entry["raw"])
                    add("model", list(raw.parts or []))
                else:
                    parts = []
                    if entry.get("text"):
                        parts.append(types.Part(text=entry["text"]))
                    for call in entry.get("calls") or []:
                        parts.append(types.Part(function_call=types.FunctionCall(
                            name=call["name"], args=call["args"])))
                    if parts:
                        add("model", parts)
            elif role == "tool":
                add("user", [
                    types.Part.from_function_response(name=r["name"], response=r["response"])
                    for r in entry["results"]
                ])
        return contents

    def generate(self, system_prompt: str, history: list[dict]) -> ModelReply:
        types = self._types
        response = self._client.models.generate_content(
            model=self._model_name,
            contents=self.to_contents(history),
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=self._tools,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                temperature=0.2,
            ),
        )

        candidate = (response.candidates or [None])[0]
        content = candidate.content if candidate else None
        parts = (content.parts if content else None) or []

        text = " ".join(
            p.text.strip() for p in parts if p.text and not p.thought
        ).strip() or None
        calls = [
            ToolCall(name=p.function_call.name, args=dict(p.function_call.args or {}))
            for p in parts
            if p.function_call
        ]
        raw = content.model_dump(mode="json", exclude_none=True) if content else None
        return ModelReply(text=text, calls=calls, raw=raw)


_model: GeminiAgentModel | None = None


def get_agent_model() -> AgentModel:
    from app.core.config import settings

    global _model
    if _model is None:
        _model = GeminiAgentModel(
            api_key=settings.gemini_api_key,
            model_name=settings.reminder_call_agent_model or settings.gemini_model,
        )
    return _model
