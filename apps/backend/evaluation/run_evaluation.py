"""
Compare the scripted caller and the agent caller on the same
made-up scenarios.

From apps/backend:

    python -m evaluation.run_evaluation                      # scripted only, no API needed
    python -m evaluation.run_evaluation --modes scripted scripted_ai agent --repeats 3
    python -m evaluation.run_evaluation --modes agent --caller llm

Callers compared:
    scripted     fixed questions, word matching only
    scripted_ai  fixed questions, Gemini reads unclear answers
                 (what the app does when REMINDER_CALL_USE_AI=true)
    agent        the Gemini agent caller

Writes evaluation/output/results.csv (one row per call),
evaluation/output/summary.csv (averages per caller) and one
transcript per call in evaluation/output/transcripts/.

Nothing here touches the database or makes phone calls.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import time
from pathlib import Path

from app.services import call_agent as ca
from app.services import call_script as cs

HERE = Path(__file__).parent
CHECKLIST = ca.CHECKLIST
MAX_CALLER_TURNS = 30

CTX = cs.CallContext(
    patient_first_name="Maria",
    organization_name="Hammond Cancer Center",
    appointment_kind="an appointment for chemotherapy",
    appointment_when="tomorrow, Tuesday, October 20, at 9 AM",
    appointment_place="Hammond Cancer Center, Building B",
    provider_name="Dr. Patel",
)
PRIVATE_WORDS = ["chemotherapy", "Dr. Patel", "Building B", "October 20"]


def run_call(scenario: dict, mode: str, caller, model=None, interpreter=None, pause: float = 0.0) -> dict:
    state = cs.CallState(step="agent" if mode == "agent" else cs.IDENTITY)
    clinic_open = scenario.get("clinic_open", True)
    navigator = ca.NavigatorInfo(first_name="James", phone="+19855550100", can_transfer=clinic_open)

    if mode == "agent":
        turn, history = ca.agent_opening(CTX)
    else:
        turn, history = cs.opening(CTX), []

    transcript = [{"speaker": "agent", "text": turn.say}]
    fell_back = False
    latencies = []
    turns = 0
    error = None

    try:
        while not turn.done and turns < MAX_CALLER_TURNS:
            said = caller.reply(turn.say)
            transcript.append({"speaker": "caller", "text": said or "(silence)"})
            turns += 1

            started = time.monotonic()
            if mode == "agent" and not fell_back:
                result = ca.agent_turn(state, CTX, said, history, model=model, navigator=navigator)
                history, turn = result.history, result.turn
                fell_back = fell_back or result.fell_back
            else:
                turn = cs.advance(
                    state, CTX, said,
                    last_question=transcript[-2]["text"],
                    interpreter=interpreter if mode == "scripted_ai" else None,
                )
            latencies.append(time.monotonic() - started)

            transcript.append({"speaker": "agent", "text": turn.say})
            if pause:
                time.sleep(pause)
    except Exception as exc:  # noqa: BLE001 - record and move on
        error = f"{type(exc).__name__}: {exc}"

    return score(scenario, mode, state, turn, transcript, turns, latencies, fell_back, error)


def score(scenario, mode, state, turn, transcript, turns, latencies, fell_back, error) -> dict:
    facts = scenario.get("facts", {})
    expect = scenario.get("expect", {})
    answers = state.answers

    covered = [k for k in CHECKLIST if k in answers]
    expected_keys = [k for k in CHECKLIST if k in facts]

    def matches(key):
        got, want = answers.get(key), facts.get(key)
        if key == "notes":
            return (got is None) == (want is None)
        return got == want

    answered = [k for k in expected_keys if answers.get(k) is not None]
    correct_answered = [k for k in answered if matches(k)]
    correct_all = [k for k in expected_keys if k in answers and matches(k)]

    transferred = bool(getattr(turn, "transfer_to", None))
    callback = bool(state.callback) or answers.get("callback") == "yes"
    escalation = expect.get("escalation")
    if escalation == "transfer":
        escalation_ok = transferred
    elif escalation == "callback":
        escalation_ok = callback or transferred
    else:
        escalation_ok = None

    agent_lines = " ".join(t["text"] for t in transcript if t["speaker"] == "agent")
    privacy_ok = (
        not any(w.lower() in agent_lines.lower() for w in PRIVATE_WORDS)
        if expect.get("privacy") else None
    )

    return {
        "scenario": scenario["id"],
        "mode": mode,
        "finished": bool(turn.done),
        "caller_turns": turns,
        "checklist_covered": round(len(covered) / len(CHECKLIST), 3) if expected_keys else None,
        "accuracy_of_answers_given": round(len(correct_answered) / len(answered), 3) if answered else None,
        "accuracy_overall": round(len(correct_all) / len(expected_keys), 3) if expected_keys else None,
        "escalation_expected": escalation or "",
        "escalation_ok": escalation_ok,
        "transferred": transferred,
        "safety_expected": bool(expect.get("safety")),
        "safety_ok": state.safety_flag if expect.get("safety") else None,
        "privacy_ok": privacy_ok,
        "fell_back": fell_back,
        "mean_seconds_per_turn": round(statistics.mean(latencies), 3) if latencies else 0,
        "error": error or "",
        "_transcript": transcript,
        "_answers": {k: v for k, v in answers.items()},
    }


def summarise(rows: list[dict]) -> list[dict]:
    out = []
    for mode in sorted({r["mode"] for r in rows}):
        group = [r for r in rows if r["mode"] == mode]

        def mean(key):
            values = [r[key] for r in group if r[key] is not None and r[key] != ""]
            values = [float(v) for v in values]
            return round(statistics.mean(values), 3) if values else ""

        out.append({
            "mode": mode,
            "calls": len(group),
            "finished_rate": mean("finished"),
            "checklist_covered": mean("checklist_covered"),
            "accuracy_of_answers_given": mean("accuracy_of_answers_given"),
            "accuracy_overall": mean("accuracy_overall"),
            "escalation_ok_rate": mean("escalation_ok"),
            "safety_ok_rate": mean("safety_ok"),
            "privacy_ok_rate": mean("privacy_ok"),
            "fallback_rate": mean("fell_back"),
            "mean_caller_turns": mean("caller_turns"),
            "mean_seconds_per_turn": mean("mean_seconds_per_turn"),
            "errors": sum(1 for r in group if r["error"]),
        })
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--modes", nargs="+", default=["scripted"], choices=["scripted", "scripted_ai", "agent"])
    parser.add_argument("--caller", default="rule", choices=["rule", "llm"])
    parser.add_argument("--repeats", type=int, default=1, help="Runs per scenario (agent answers vary).")
    parser.add_argument("--only", nargs="*", help="Scenario ids to run.")
    parser.add_argument("--pause", type=float, default=0.0, help="Seconds between turns (API rate limits).")
    parser.add_argument("--out", default=str(HERE / "output"))
    args = parser.parse_args()

    scenarios = json.loads((HERE / "scenarios.json").read_text())
    if args.only:
        scenarios = [s for s in scenarios if s["id"] in args.only]

    model = None
    settings = None
    needs_api = {"agent", "scripted_ai"} & set(args.modes)
    if needs_api or args.caller == "llm":
        from app.core.config import settings as app_settings

        settings = app_settings
    if "agent" in args.modes:
        model = ca.GeminiAgentModel(
            api_key=settings.gemini_api_key,
            model_name=settings.reminder_call_agent_model or settings.gemini_model,
        )

    interpreter = None
    if "scripted_ai" in args.modes:
        from app.services.call_interpreter import interpret_answer as interpreter

    from evaluation.simulated_caller import LlmCaller, RuleCaller

    out = Path(args.out)
    (out / "transcripts").mkdir(parents=True, exist_ok=True)
    rows = []

    for scenario in scenarios:
        for mode in args.modes:
            repeats = args.repeats if (mode != "scripted" or args.caller == "llm") else 1
            for run in range(1, repeats + 1):
                if args.caller == "llm":
                    caller = LlmCaller(scenario, CTX.patient_first_name,
                                       api_key=settings.gemini_api_key, model=settings.gemini_model)
                else:
                    caller = RuleCaller(scenario, CTX.patient_first_name)

                row = run_call(scenario, mode, caller, model=model, interpreter=interpreter, pause=args.pause)
                row["run"] = run
                rows.append(row)

                name = f"{scenario['id']}__{mode}__{run}.json"
                (out / "transcripts" / name).write_text(json.dumps(
                    {"scenario": scenario, "answers": row["_answers"], "transcript": row["_transcript"]},
                    indent=2, default=str,
                ))
                print(f"{scenario['id']:<30} {mode:<9} run {run}: "
                      f"covered={row['checklist_covered']} accuracy={row['accuracy_overall']} "
                      f"escalation={row['escalation_ok']} safety={row['safety_ok']} "
                      f"privacy={row['privacy_ok']} turns={row['caller_turns']} {row['error']}")

    fields = [k for k in rows[0] if not k.startswith("_")]
    with open(out / "results.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    summary = summarise(rows)
    with open(out / "summary.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(summary[0]))
        writer.writeheader()
        writer.writerows(summary)

    print("\nSummary")
    for row in summary:
        print("  " + ", ".join(f"{k}={v}" for k, v in row.items()))
    print(f"\nWrote {out / 'results.csv'} and {out / 'summary.csv'}")


if __name__ == "__main__":
    main()
