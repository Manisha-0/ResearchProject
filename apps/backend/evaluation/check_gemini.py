"""
Quick check that the Gemini AI caller is working.

Run from apps/backend with the virtual environment on:

    python -m evaluation.check_gemini

It has a short pretend conversation with the AI caller,
using your GEMINI_API_KEY from .env, and tells you whether
Gemini answered or the call fell back to the fixed questions.
No database, Twilio or patient record is needed.
"""

import time

from app.core.config import settings
from app.services import call_agent as ca
from app.services import call_script as cs

CTX = cs.CallContext(
    patient_first_name="Maria",
    organization_name="Hammond Cancer Center",
    appointment_kind="an appointment for chemotherapy",
    appointment_when="on Monday at 9 AM",
    appointment_place="Building B",
    provider_name="Dr. Patel",
)

# Answers a real caller might give, including vague ones
# the fixed questions would struggle with.
CALLER = [
    "yeah this is Maria",
    "I think so, as long as my grandson can get off work",
    "he usually drives me but he wasn't sure this time",
    "I've got enough pills for now",
    "kind of tired, maybe a five",
    "no that's all, thank you",
]


def main() -> None:
    key = settings.gemini_api_key or ""
    model_name = settings.reminder_call_agent_model or settings.gemini_model
    print(f"Model:   {model_name}")
    print(f"API key: {'set (ends in ...' + key[-4:] + ')' if len(key) > 8 else 'MISSING'}")
    print("-" * 60)

    model = ca.get_agent_model()
    state = cs.CallState()
    turn, history = ca.agent_opening(CTX)
    print(f"AI:     {turn.say}")

    for said in CALLER:
        if turn.done:
            break
        print(f"Caller: {said}")
        started = time.monotonic()
        result = ca.agent_turn(state, CTX, said, history, model=model)
        seconds = time.monotonic() - started
        turn, history = result.turn, result.history

        if result.fell_back:
            print("-" * 60)
            print("NOT WORKING: Gemini did not answer, so the call")
            print("switched to the fixed questions.")
            print(f"Reason: {result.error}")
            print()
            print("Common causes:")
            print("  - wrong or expired GEMINI_API_KEY in .env")
            print("  - model name not available to your key (try gemini-2.5-flash)")
            print("  - free-tier rate limit: wait a minute and run again")
            return

        print(f"AI:     {turn.say}   [{seconds:.1f}s]")

    print("-" * 60)
    print("WORKING: Gemini ran the whole conversation.")
    print("Answers it saved:")
    for name, value in state.answers.items():
        if not name.startswith("_"):
            print(f"  {name:18} {value}")


if __name__ == "__main__":
    main()