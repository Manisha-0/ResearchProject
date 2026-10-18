"""
Tests for the agent caller's guard rails.

A fake model replays tool calls and lines chosen by each
test, so these run with no network and no Gemini key.
"""

from app.services import call_agent as ca
from app.services import call_script as cs


CTX = cs.CallContext(
    patient_first_name="Maria",
    organization_name="Hammond Cancer Center",
    appointment_kind="an appointment for chemotherapy",
    appointment_when="on Monday, October 19 at 9 AM",
    appointment_place="Building B",
    provider_name="Dr. Patel",
)

NAV_OPEN = ca.NavigatorInfo(first_name="James", phone="+19855550100", can_transfer=True)
NAV_CLOSED = ca.NavigatorInfo(first_name="James", phone="+19855550100", can_transfer=False)


def call(name, **args):
    return ca.ToolCall(name=name, args=args)


class FakeModel:
    """Returns the queued replies in order and records the prompts it saw."""

    def __init__(self, *replies):
        self.replies = list(replies)
        self.prompts = []

    def generate(self, system_prompt, history):
        self.prompts.append(system_prompt)
        if not self.replies:
            raise AssertionError("FakeModel ran out of replies")
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        if isinstance(reply, str):
            return ca.ModelReply(text=reply)
        return ca.ModelReply(text=None, calls=list(reply))


def start():
    state = cs.CallState(step="agent")
    _, history = ca.agent_opening(CTX)
    return state, history


def tool_results(history):
    return [r for h in history if h["role"] == "tool" for r in h["results"]]


def test_opening_is_fixed_and_asks_identity():
    turn, history = ca.agent_opening(CTX)
    assert "Am I speaking with Maria" in turn.say
    assert history[0]["role"] == "model"


def test_no_appointment_details_before_identity():
    state, history = start()
    model = FakeModel("Sorry, who am I speaking with?")
    ca.agent_turn(state, CTX, "hello?", history, model=model)
    prompt = model.prompts[0]
    assert "chemotherapy" not in prompt
    assert "Dr. Patel" not in prompt
    assert "Building B" not in prompt


def test_details_given_after_identity_confirmed():
    state, history = start()
    model = FakeModel(
        [call("confirm_identity", answered_by="caregiver")],
        "Thank you. Maria has chemotherapy on Monday. Will she be able to come?",
    )
    result = ca.agent_turn(state, CTX, "I'm her daughter", history, model=model)
    assert state.answered_by == "caregiver"
    assert "chemotherapy" in model.prompts[1]
    assert "someone who helps Maria" in model.prompts[1]
    assert result.turn.say.startswith("Thank you")


def test_answers_rejected_before_identity():
    state, history = start()
    model = FakeModel([call("save_answer", field="attendance", value="yes")], "Who am I speaking with?")
    result = ca.agent_turn(state, CTX, "yes", history, model=model)
    assert "attendance" not in state.answers
    assert "error" in tool_results(result.history)[0]["response"]


def test_invalid_values_are_rejected():
    state, history = start()
    state.answered_by = "patient"
    model = FakeModel(
        [
            call("save_answer", field="transportation", value="maybe tomorrow"),
            call("save_answer", field="symptom_severity", value="14"),
            call("save_answer", field="favourite_colour", value="blue"),
            call("save_answer", field="cost", value="no"),
        ],
        "Okay. Do you have a ride?",
    )
    result = ca.agent_turn(state, CTX, "...", history, model=model)
    responses = [r["response"] for r in tool_results(result.history)]
    assert ["error" in r for r in responses] == [True, True, True, False]
    assert state.answers == {"cost": "no"}


def test_unknown_value_counts_as_asked():
    state, history = start()
    state.answered_by = "patient"
    model = FakeModel([call("save_answer", field="symptom_severity", value="unknown")], "Okay.")
    ca.agent_turn(state, CTX, "I'd rather not say", history, model=model)
    assert "symptom_severity" in state.answers
    assert state.answers["symptom_severity"] is None


def test_cannot_end_with_missing_items():
    state, history = start()
    state.answered_by = "patient"
    model = FakeModel([call("end_call", reason="completed")], "One more thing: do you have a ride?")
    result = ca.agent_turn(state, CTX, "bye", history, model=model)
    assert not result.turn.done
    assert "Still needed" in tool_results(result.history)[0]["response"]["error"]


def test_end_after_full_checklist():
    state, history = start()
    state.answered_by = "patient"
    model = FakeModel(
        [
            call("save_answer", field="attendance", value="yes"),
            call("save_answer", field="transportation", value="yes"),
            call("save_answer", field="medication", value="no"),
            call("save_answer", field="symptom_severity", value="3"),
            call("save_answer", field="cost", value="no"),
            call("save_answer", field="notes", value="none"),
            call("save_answer", field="callback", value="no"),
            call("end_call", reason="completed"),
        ]
    )
    result = ca.agent_turn(state, CTX, "no, that's all", history, model=model)
    assert result.turn.done
    assert not state.ended_early
    assert state.answers["symptom_severity"] == 3
    assert state.answers["notes"] is None
    assert not cs.needs_follow_up(state)


def test_caller_can_stop_early():
    state, history = start()
    state.answered_by = "patient"
    model = FakeModel([call("end_call", reason="caller_declined")])
    result = ca.agent_turn(state, CTX, "I don't want to do this now", history, model=model)
    assert result.turn.done
    assert state.ended_early


def test_wrong_person_ends_without_details():
    state, history = start()
    model = FakeModel([call("confirm_identity", answered_by="wrong_person")])
    result = ca.agent_turn(state, CTX, "wrong number", history, model=model)
    assert result.turn.done
    assert state.answered_by == "wrong_person"
    assert "chemotherapy" not in result.turn.say


def test_emergency_never_reaches_model():
    state, history = start()
    state.answered_by = "patient"
    model = FakeModel()  # would fail if called
    result = ca.agent_turn(state, CTX, "I have chest pain right now", history, model=model)
    assert result.turn.done
    assert "9 1 1" in result.turn.say
    assert state.safety_flag
    assert state.callback["urgency"] == "urgent"
    assert model.prompts == []


def test_request_human_transfers_during_clinic_hours():
    state, history = start()
    state.answered_by = "patient"
    model = FakeModel([call("request_human", topic="symptoms", urgency="today", reason="Feeling dizzy")])
    result = ca.agent_turn(state, CTX, "can I talk to a nurse", history, model=model, navigator=NAV_OPEN)
    assert result.turn.done
    assert result.turn.transfer_to == "+19855550100"
    assert "James" in result.turn.say
    assert state.callback == {"topic": "symptoms", "reason": "Feeling dizzy", "urgency": "today"}
    assert state.answers["callback"] == "yes"


def test_request_human_books_callback_after_hours():
    state, history = start()
    state.answered_by = "patient"
    model = FakeModel(
        [call("request_human", topic="ride", urgency="today", reason="No ride on Monday")],
        "James will call you back today. Can I ask two more quick questions?",
    )
    result = ca.agent_turn(state, CTX, "I need help with a ride", history, model=model, navigator=NAV_CLOSED)
    assert not result.turn.done
    assert result.turn.transfer_to is None
    assert tool_results(result.history)[0]["response"]["status"] == "callback_booked"
    assert state.callback["topic"] == "ride"


def test_bad_topic_and_urgency_are_cleaned():
    state, history = start()
    state.answered_by = "patient"
    model = FakeModel([call("request_human", topic="pizza", urgency="asap", reason="x")], "Okay.")
    ca.agent_turn(state, CTX, "help", history, model=model, navigator=NAV_CLOSED)
    assert state.callback["topic"] == "other"
    assert state.callback["urgency"] == "routine"


def test_model_failure_falls_back_to_script():
    state, history = start()
    state.answered_by = "patient"
    state.answers["attendance"] = "yes"
    model = FakeModel(TimeoutError("slow"))
    result = ca.agent_turn(state, CTX, "yes", history, model=model)
    assert result.fell_back
    assert state.step == cs.TRANSPORTATION
    assert "ride" in result.turn.say


def test_model_failure_before_identity_falls_back_to_identity():
    state, history = start()
    model = FakeModel(RuntimeError("down"))
    result = ca.agent_turn(state, CTX, "hello", history, model=model)
    assert result.fell_back
    assert state.step == cs.IDENTITY


def test_empty_model_reply_falls_back():
    state, history = start()
    state.answered_by = "patient"
    model = FakeModel("   ")
    result = ca.agent_turn(state, CTX, "yes", history, model=model)
    assert result.fell_back


def test_endless_tool_rounds_fall_back():
    state, history = start()
    state.answered_by = "patient"
    rounds = [[call("save_answer", field="cost", value="no")] for _ in range(ca.MAX_TOOL_ROUNDS + 1)]
    result = ca.agent_turn(state, CTX, "no", history, model=FakeModel(*rounds))
    assert result.fell_back


def test_history_round_trips_to_gemini_contents():
    """The stored JSON history converts to Gemini's format without a network call."""
    from google.genai import types

    model = ca.GeminiAgentModel.__new__(ca.GeminiAgentModel)
    model._types = types
    raw = types.Content(
        role="model",
        parts=[types.Part(function_call=types.FunctionCall(name="end_call", args={"reason": "completed"}),
                          thought_signature=b"sig")],
    ).model_dump(mode="json", exclude_none=True)
    history = [
        {"role": "model", "text": "Hello", "calls": []},
        {"role": "user", "text": "yes"},
        {"role": "model", "text": None, "calls": [{"name": "end_call", "args": {"reason": "completed"}}], "raw": raw},
        {"role": "tool", "results": [{"name": "end_call", "response": {"ok": True}}]},
    ]
    contents = model.to_contents(history)
    assert [c.role for c in contents] == ["model", "user", "model", "user"]
    assert contents[2].parts[0].thought_signature == b"sig"
    assert contents[3].parts[0].function_response.name == "end_call"
