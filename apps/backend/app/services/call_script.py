"""
Reminder call script.

The call follows a fixed list of short questions. The
script decides what is asked and in what order; the
patient's spoken answer is only *interpreted* (yes / no /
a number / free words). Interpretation is done with
simple word matching first and, only when that is not
sure, with Gemini (see call_interpreter.py).

Nothing in this module touches the database, so the
whole conversation can be unit-tested by feeding it
strings.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable

# ---------------------------------------------------------
# Steps
# ---------------------------------------------------------

IDENTITY = "identity"
IDENTITY_CONFIRM = "identity_confirm"
ATTENDANCE = "attendance"
TRANSPORTATION = "transportation"
MEDICATION = "medication"
SYMPTOMS = "symptoms"
COST = "cost"
ANYTHING_ELSE = "anything_else"
CALLBACK = "callback"
DONE = "done"

QUESTION_ORDER = [
    ATTENDANCE,
    TRANSPORTATION,
    MEDICATION,
    SYMPTOMS,
    COST,
    ANYTHING_ELSE,
    CALLBACK,
]

YES_NO_STEPS = {
    IDENTITY_CONFIRM,
    ATTENDANCE,
    TRANSPORTATION,
    MEDICATION,
    COST,
    CALLBACK,
}

MAX_REPROMPTS = 1

UNCLEAR = "unclear"


@dataclass
class CallContext:
    patient_first_name: str
    organization_name: str
    appointment_kind: str  # "an oncology follow-up appointment"
    appointment_when: str  # "on Monday, October 19 at 2:30 PM"
    appointment_place: str | None  # "Ochsner Cancer Center, Room 4"
    provider_name: str | None = None


@dataclass
class CallState:
    step: str = IDENTITY
    reprompts: int = 0
    answered_by: str | None = None  # patient | caregiver | wrong_person
    answers: dict = field(default_factory=dict)
    safety_flag: bool = False
    ended_early: bool = False

    @property
    def finished(self) -> bool:
        return self.step == DONE


@dataclass
class Turn:
    say: str
    step: str
    done: bool = False
    # What kind of answer the next prompt expects. The
    # phone layer uses this to pick keypad hints.
    expects: str = "yes_no"


# Interpreter signature: (step, question_text, caller_text) -> value
Interpreter = Callable[[str, str, str], object]


# ---------------------------------------------------------
# Word matching
# ---------------------------------------------------------

_NUMBER_WORDS = {
    "zero": 0, "none": 0, "one": 1, "two": 2, "to": 2, "too": 2,
    "three": 3, "four": 4, "for": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}

_UNSURE = [
    "not sure", "don't know", "dont know", "do not know",
    "maybe", "i think so", "probably", "unsure", "no idea",
    "not certain",
]

_NO = [
    "no", "nope", "nah", "not", "don't", "dont", "do not",
    "can't", "cant", "cannot", "won't", "wont", "haven't",
    "havent", "never", "negative", "unable", "nobody", "no one",
    "no ride", "isn't", "isnt", "aren't", "arent",
]

_YES = [
    "yes", "yeah", "yep", "yup", "sure", "correct", "right",
    "of course", "okay", "ok", "absolutely", "definitely",
    "uh huh", "i do", "i will", "i can", "i have", "please",
    "that's me", "thats me", "speaking", "it's me", "its me",
    "affirmative", "already", "i'll be there", "ill be there",
    "will be there", "i'll make it", "ill make it", "be there",
    "driving me", "drive me", "taking me", "take me", "bring me",
    "bringing me", "pick me up", "picking me up", "got a ride",
    "i'd like that", "id like that", "that would be good",
]

_CAREGIVER = [
    "daughter", "son", "wife", "husband", "mother", "father",
    "mom", "dad", "sister", "brother", "caregiver", "care giver",
    "friend", "helping", "helper", "aunt", "uncle", "grand",
    "niece", "nephew", "partner", "neighbor", "on behalf",
    "family", "cousin", "in-law",
]

_WRONG_PERSON = [
    "wrong number", "no one by that name", "nobody by that name",
    "don't know who", "dont know who", "never heard",
    "who is that", "who's that",
]

_EMERGENCY = [
    "chest pain", "can't breathe", "cant breathe", "cannot breathe",
    "trouble breathing", "hard to breathe", "bleeding a lot",
    "won't stop bleeding", "passed out", "fainted", "emergency",
    "911", "nine one one", "ambulance", "stroke", "seizure",
]

_SELF_HARM = [
    "kill myself", "suicide", "want to die", "end my life",
    "hurt myself", "don't want to live", "dont want to live",
]

_NOTHING = [
    "no", "nothing", "that's all", "thats all", "that is all",
    "nope", "i'm good", "im good", "all good", "no thank you",
    "no thanks", "not really",
]


def _cap(text: str) -> str:
    return text[:1].upper() + text[1:]


def _clean(text: str) -> str:
    text = text.lower().replace("’", "'")
    text = re.sub(r"[^a-z0-9' ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _has_phrase(text: str, phrases: list[str]) -> bool:
    padded = f" {text} "
    return any(f" {p} " in padded for p in phrases)


def detect_emergency(text: str) -> str | None:
    cleaned = _clean(text)
    if _has_phrase(cleaned, _SELF_HARM):
        return "self_harm"
    if _has_phrase(cleaned, _EMERGENCY):
        return "emergency"
    return None


def match_yes_no(text: str, digits: str | None = None) -> str:
    if digits:
        if digits.startswith("1"):
            return "yes"
        if digits.startswith("2"):
            return "no"

    cleaned = _clean(text)
    if not cleaned:
        return UNCLEAR

    # Order matters: "not sure" must not read as "no",
    # and "I don't have" must not read as "I have".
    if _has_phrase(cleaned, _UNSURE):
        return "unsure"
    if _has_phrase(cleaned, _NO):
        return "no"
    if _has_phrase(cleaned, _YES):
        return "yes"
    return UNCLEAR


def match_number(text: str, digits: str | None = None) -> int | str:
    if digits and digits.isdigit():
        value = int(digits)
        return value if 0 <= value <= 10 else UNCLEAR

    cleaned = _clean(text)
    found = re.findall(r"\b(10|[0-9])\b", cleaned)
    if found:
        return int(found[0])

    for word in cleaned.split():
        if word in _NUMBER_WORDS and word not in ("to", "too", "for"):
            return _NUMBER_WORDS[word]

    # "to", "too" and "for" are common mis-hearings of
    # two and four, but only trust them alone.
    if cleaned in _NUMBER_WORDS:
        return _NUMBER_WORDS[cleaned]

    return UNCLEAR


def match_identity(text: str, first_name: str) -> str:
    cleaned = _clean(text)
    if not cleaned:
        return UNCLEAR
    if _has_phrase(cleaned, _WRONG_PERSON):
        return "wrong_person"
    if _has_phrase(cleaned, _CAREGIVER):
        return "caregiver"

    name = _clean(first_name)
    if name and (
        _has_phrase(cleaned, [f"this is {name}", f"i am {name}",
                              f"i'm {name}", f"im {name}"])
        or cleaned == name
    ):
        return "patient"

    yes_no = match_yes_no(cleaned)
    if yes_no == "yes":
        return "patient"
    if yes_no == "no":
        return "not_patient"
    return UNCLEAR


# ---------------------------------------------------------
# Prompts
# ---------------------------------------------------------

KEYPAD_YES_NO = "You can say yes or no, or press 1 for yes and 2 for no."


def _who(state: CallState, ctx: CallContext) -> dict[str, str]:
    """Words that change when a caregiver is on the line."""
    if state.answered_by == "caregiver":
        name = ctx.patient_first_name
        return {
            "you": name,
            "your": f"{name}'s",
            "are_you": f"is {name}",
            "do_you": f"does {name}",
            "will_you": f"will {name}",
            "you_are": f"{name} is",
        }
    return {
        "you": "you",
        "your": "your",
        "are_you": "are you",
        "do_you": "do you",
        "will_you": "will you",
        "you_are": "you are",
    }


def opening(ctx: CallContext) -> Turn:
    name = ctx.patient_first_name
    return Turn(
        say=(
            f"Hello. This is an automated reminder call from "
            f"{ctx.organization_name}. I am calling for {name}. "
            f"Am I speaking with {name}, or with someone who "
            f"helps {name}?"
        ),
        step=IDENTITY,
        expects="identity",
    )


def prompt_for(step: str, state: CallState, ctx: CallContext) -> Turn:
    w = _who(state, ctx)

    if step == IDENTITY_CONFIRM:
        return Turn(
            say=(
                f"Are you helping {ctx.patient_first_name} with "
                f"their care? {KEYPAD_YES_NO}"
            ),
            step=step,
        )

    if step == ATTENDANCE:
        with_provider = (
            f" with {ctx.provider_name}" if ctx.provider_name else ""
        )
        place = (
            f" at {ctx.appointment_place}" if ctx.appointment_place else ""
        )
        if state.answered_by == "caregiver":
            name = ctx.patient_first_name
            say = (
                f"Thank you for helping. {name} has {ctx.appointment_kind}"
                f"{with_provider} {ctx.appointment_when}{place}. "
                f"Will {name} be able to make it?"
            )
        else:
            say = (
                f"Thank you. You have {ctx.appointment_kind}"
                f"{with_provider} {ctx.appointment_when}{place}. "
                f"Will you be able to make it?"
            )
        return Turn(say=say, step=step)

    if step == TRANSPORTATION:
        return Turn(
            say=(
                f"{_cap(w['do_you'])} have a ride to the "
                f"appointment?"
            ),
            step=step,
        )

    if step == MEDICATION:
        return Turn(
            say=(
                f"{_cap(w['are_you'])} having any trouble "
                f"getting medicines?"
            ),
            step=step,
        )

    if step == SYMPTOMS:
        return Turn(
            say=(
                f"How {w['are_you']} feeling today? Please say a "
                f"number from zero to ten. Zero means feeling fine, "
                f"and ten means feeling very bad. You can also press "
                f"the number on the keypad."
            ),
            step=step,
            expects="number",
        )

    if step == COST:
        return Turn(
            say=(
                f"{_cap(w['are_you'])} worried about the cost "
                f"of care, or about insurance?"
            ),
            step=step,
        )

    if step == ANYTHING_ELSE:
        return Turn(
            say=(
                "Is there anything else the care team should know? "
                "You can tell me now, or say no."
            ),
            step=step,
            expects="free_text",
        )

    if step == CALLBACK:
        return Turn(
            say=(
                f"Would {w['you']} like a navigator from the care team "
                f"to call back?"
            ),
            step=step,
        )

    raise ValueError(f"No prompt for step {step}")


def reprompt_for(step: str, state: CallState, ctx: CallContext) -> Turn:
    if step == IDENTITY:
        return Turn(
            say=(
                f"Sorry, I did not catch that. Is this "
                f"{ctx.patient_first_name}? {KEYPAD_YES_NO}"
            ),
            step=step,
            expects="identity",
        )

    if step == SYMPTOMS:
        return Turn(
            say=(
                "Sorry, I did not catch a number. Please say one "
                "number from zero to ten, or press it on the keypad."
            ),
            step=step,
            expects="number",
        )

    if step == ANYTHING_ELSE:
        return prompt_for(step, state, ctx)

    return Turn(
        say=f"Sorry, I did not catch that. {KEYPAD_YES_NO}",
        step=step,
    )


def closing(state: CallState, ctx: CallContext) -> str:
    if state.answers.get("callback") == "yes" or needs_follow_up(state):
        follow = "A navigator from the care team will call back soon."
    else:
        follow = "The care team will see these answers."
    return (
        f"Thank you. {follow} If anything changes, please call the "
        f"clinic. Goodbye."
    )


SAFETY_MESSAGE = (
    "That sounds serious. If this is an emergency, please hang up "
    "and call 9 1 1 now. I am letting the care team know right away."
)

SELF_HARM_MESSAGE = (
    "Thank you for telling me. You do not have to go through this "
    "alone. If you are in danger, please hang up and call 9 1 1. You "
    "can also call or text 9 8 8 at any time to talk with someone. I "
    "am letting the care team know right away."
)

COULD_NOT_HEAR_MESSAGE = (
    "I am sorry, I could not hear the answer. The care team will try "
    "again later. Goodbye."
)

WRONG_PERSON_MESSAGE = (
    "I am sorry for the trouble. Thank you for your time. Goodbye."
)


# ---------------------------------------------------------
# Conversation
# ---------------------------------------------------------


def _next_question(after: str) -> str:
    if after in (IDENTITY, IDENTITY_CONFIRM):
        return QUESTION_ORDER[0]
    index = QUESTION_ORDER.index(after)
    if index + 1 < len(QUESTION_ORDER):
        return QUESTION_ORDER[index + 1]
    return DONE


def _interpret(
    step: str,
    question: str,
    text: str,
    digits: str | None,
    ctx: CallContext,
    interpreter: Interpreter | None,
):
    if step == IDENTITY:
        value = match_identity(text, ctx.patient_first_name)
        if value == UNCLEAR and digits:
            value = "patient" if digits.startswith("1") else "not_patient"
    elif step == SYMPTOMS:
        value = match_number(text, digits)
    elif step == ANYTHING_ELSE:
        cleaned = _clean(text)
        if not cleaned:
            value = UNCLEAR
        elif _has_phrase(cleaned, _NOTHING) and len(cleaned.split()) <= 4:
            value = ""
        else:
            value = text.strip()
    else:
        value = match_yes_no(text, digits)

    # Ask the language model only when word matching
    # could not decide and there are actual words.
    if (
        value == UNCLEAR
        and interpreter is not None
        and text
        and text.strip()
        and step != ANYTHING_ELSE
    ):
        try:
            value = interpreter(step, question, text)
        except Exception:
            value = UNCLEAR

    return value


def advance(
    state: CallState,
    ctx: CallContext,
    text: str,
    *,
    digits: str | None = None,
    last_question: str = "",
    interpreter: Interpreter | None = None,
) -> Turn:
    """
    Take the caller's answer to the current step, store it,
    and return what the agent should say next.
    """

    text = text or ""
    step = state.step

    if state.finished:
        return Turn(say="", step=DONE, done=True)

    # Safety comes before anything else.
    danger = detect_emergency(text)
    if danger:
        state.safety_flag = True
        state.ended_early = True
        state.answers["safety_concern"] = text.strip()
        state.step = DONE
        return Turn(
            say=SELF_HARM_MESSAGE if danger == "self_harm" else SAFETY_MESSAGE,
            step=DONE,
            done=True,
        )

    value = _interpret(step, last_question, text, digits, ctx, interpreter)

    if value == UNCLEAR:
        if state.reprompts < MAX_REPROMPTS:
            state.reprompts += 1
            return reprompt_for(step, state, ctx)

        # Give up on this question and move on.
        value = None

    state.reprompts = 0

    if step == IDENTITY:
        if value is None:
            # Never share appointment details when we could
            # not confirm who is on the line.
            state.answered_by = "unknown"
            state.ended_early = True
            state.step = DONE
            return Turn(say=COULD_NOT_HEAR_MESSAGE, step=DONE, done=True)
        elif value == "patient":
            state.answered_by = "patient"
        elif value == "caregiver":
            state.answered_by = "caregiver"
        elif value == "wrong_person":
            return _end_wrong_person(state)
        elif value == "not_patient":
            state.step = IDENTITY_CONFIRM
            return prompt_for(IDENTITY_CONFIRM, state, ctx)

    elif step == IDENTITY_CONFIRM:
        if value == "yes":
            state.answered_by = "caregiver"
        else:
            return _end_wrong_person(state)

    elif step == SYMPTOMS:
        state.answers["symptom_severity"] = value
        if value is None and text.strip():
            state.answers["symptom_words"] = text.strip()

    elif step == ANYTHING_ELSE:
        state.answers["notes"] = value or None

    else:
        state.answers[step] = value

    next_step = _next_question(step)
    state.step = next_step

    if next_step == DONE:
        return Turn(say=closing(state, ctx), step=DONE, done=True)

    return prompt_for(next_step, state, ctx)


def _end_wrong_person(state: CallState) -> Turn:
    # Do not share any appointment details with someone
    # who is not the patient or their helper.
    state.answered_by = "wrong_person"
    state.ended_early = True
    state.step = DONE
    return Turn(say=WRONG_PERSON_MESSAGE, step=DONE, done=True)


# ---------------------------------------------------------
# Results
# ---------------------------------------------------------


def needs_follow_up(state: CallState) -> bool:
    a = state.answers
    severity = a.get("symptom_severity")
    return bool(
        state.safety_flag
        or a.get("attendance") in ("no", "unsure")
        or a.get("transportation") in ("no", "unsure")
        or a.get("medication") == "yes"
        or a.get("cost") == "yes"
        or a.get("callback") == "yes"
        or (isinstance(severity, int) and severity >= 7)
        or a.get("notes")
    )


def build_summary(state: CallState, ctx: CallContext) -> str:
    """Plain summary for the navigator. Built from answers only."""

    a = state.answers
    who = {
        "patient": f"{ctx.patient_first_name} answered",
        "caregiver": f"A caregiver answered for {ctx.patient_first_name}",
        "wrong_person": "Someone other than the patient answered; no details were shared",
        "unknown": "The person who answered was not confirmed",
    }.get(state.answered_by or "unknown")

    lines = []

    if state.safety_flag:
        lines.append(
            "URGENT: the caller described a possible emergency and was "
            "told to call 911. Call back as soon as possible."
        )

    lines.append(f"{who}.")

    def yn(key: str, yes: str, no: str, unsure: str | None = None):
        value = a.get(key)
        if value == "yes":
            lines.append(yes)
        elif value == "no":
            lines.append(no)
        elif value == "unsure" and unsure:
            lines.append(unsure)

    yn("attendance", "Plans to attend the appointment.",
       "Said they cannot attend the appointment.",
       "Not sure they can attend the appointment.")
    yn("transportation", "Has a ride.", "Does not have a ride yet.",
       "Not sure about a ride.")
    yn("medication", "Having trouble getting medicines.",
       "No trouble getting medicines.")

    severity = a.get("symptom_severity")
    if isinstance(severity, int):
        lines.append(f"Rated how they feel as {severity} out of 10.")
    elif a.get("symptom_words"):
        lines.append(f'Described how they feel as: "{a["symptom_words"]}".')

    yn("cost", "Worried about cost or insurance.",
       "No cost or insurance worries mentioned.")

    if a.get("notes"):
        lines.append(f'Also said: "{a["notes"]}".')

    yn("callback", "Asked for a call back.", "Did not ask for a call back.")

    if state.ended_early and not state.safety_flag and state.answered_by != "wrong_person":
        lines.append("The call ended before all questions were answered.")

    return " ".join(lines)
