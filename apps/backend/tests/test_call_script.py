"""
Run with:  python -m pytest tests -q

These tests feed typed answers into the reminder call
script and check what gets recorded. They need no
database, Twilio account or Gemini key.
"""

import pytest

from app.services import call_script as cs


CTX = cs.CallContext(
    patient_first_name="Maria",
    organization_name="Hammond Cancer Center",
    appointment_kind="an appointment for chemotherapy",
    appointment_when="on Monday, October 19 at 9 AM",
    appointment_place="Building B",
    provider_name="Dr. Patel",
)


def run(*answers, interpreter=None):
    state = cs.CallState()
    turns = [cs.opening(CTX)]
    for answer in answers:
        turns.append(
            cs.advance(state, CTX, answer, last_question=turns[-1].say,
                       interpreter=interpreter)
        )
    return state, turns


# ---------------------------------------------------------
# Word matching
# ---------------------------------------------------------

@pytest.mark.parametrize("text, expected", [
    ("yes", "yes"),
    ("Yeah I'll be there", "yes"),
    ("my son will drive me", "yes"),
    ("no", "no"),
    ("I don't have a ride", "no"),
    ("nobody can take me", "no"),
    ("no problem", "no"),
    ("I'm not sure", "unsure"),
    ("maybe", "unsure"),
    ("", cs.UNCLEAR),
    ("the weather is nice", cs.UNCLEAR),
])
def test_yes_no(text, expected):
    assert cs.match_yes_no(text) == expected


def test_keypad_yes_no():
    assert cs.match_yes_no("", digits="1") == "yes"
    assert cs.match_yes_no("", digits="2") == "no"


@pytest.mark.parametrize("text, expected", [
    ("seven", 7),
    ("I'd say a 4", 4),
    ("10", 10),
    ("zero", 0),
    ("pretty bad", cs.UNCLEAR),
])
def test_numbers(text, expected):
    assert cs.match_number(text) == expected


@pytest.mark.parametrize("text, expected", [
    ("yes this is Maria", "patient"),
    ("speaking", "patient"),
    ("this is her daughter", "caregiver"),
    ("I'm her husband", "caregiver"),
    ("you have the wrong number", "wrong_person"),
    ("no", "not_patient"),
])
def test_identity(text, expected):
    assert cs.match_identity(text, "Maria") == expected


# ---------------------------------------------------------
# Whole calls
# ---------------------------------------------------------

def test_patient_with_no_problems():
    state, turns = run("yes", "yes", "yes", "no", "two", "no", "no", "no")
    assert turns[-1].done
    assert state.answered_by == "patient"
    assert state.answers["attendance"] == "yes"
    assert state.answers["transportation"] == "yes"
    assert state.answers["symptom_severity"] == 2
    assert state.answers["notes"] is None
    assert not cs.needs_follow_up(state)


def test_caregiver_reports_barriers():
    state, turns = run(
        "this is her son", "not sure", "no", "yes", "eight",
        "yes", "she is very tired", "yes",
    )
    assert state.answered_by == "caregiver"
    # The questions talk about Maria, not "you".
    assert "Will Maria be able to make it" in turns[1].say
    assert "Does Maria have a ride" in turns[2].say
    assert cs.needs_follow_up(state)
    summary = cs.build_summary(state, CTX)
    assert "caregiver" in summary.lower()
    assert "8 out of 10" in summary


def test_wrong_person_hears_no_details():
    state, turns = run("no", "no")
    assert turns[-1].done
    assert state.answered_by == "wrong_person"
    spoken = " ".join(t.say for t in turns)
    assert "chemotherapy" not in spoken
    assert "Dr. Patel" not in spoken


def test_silence_on_identity_ends_without_details():
    state, turns = run("", "")
    assert turns[-1].done
    assert state.answered_by == "unknown"
    assert "chemotherapy" not in " ".join(t.say for t in turns)


def test_unclear_answer_is_asked_again_once_then_skipped():
    state, turns = run("yes", "purple", "purple")
    assert "did not catch" in turns[2].say
    assert state.answers["attendance"] is None
    assert "ride" in turns[3].say


def test_emergency_stops_the_call():
    state, turns = run("yes", "yes", "I have chest pain right now")
    assert turns[-1].done
    assert "9 1 1" in turns[-1].say
    assert state.safety_flag
    assert cs.needs_follow_up(state)


def test_self_harm_gives_988():
    state, turns = run("yes", "I want to die")
    assert "9 8 8" in turns[-1].say
    assert state.safety_flag


def test_interpreter_only_used_when_words_are_unclear():
    calls = []

    def fake(step, question, answer):
        calls.append(answer)
        return "yes"

    state, _ = run("yes", "I will be there", "grandson usually handles that", interpreter=fake)
    assert calls == ["grandson usually handles that"]
    assert state.answers["transportation"] == "yes"


def test_interpreter_failure_falls_back_to_reprompt():
    def broken(*_):
        raise TimeoutError

    state, turns = run("yes", "hmm well", interpreter=broken)
    assert "did not catch" in turns[-1].say
