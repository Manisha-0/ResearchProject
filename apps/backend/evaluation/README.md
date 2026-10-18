# Caller evaluation

Compares three ways of running the reminder call on the same
made-up scenarios:

| Caller | What it is |
| --- | --- |
| `scripted` | Fixed questions in a fixed order; answers read by word matching only |
| `scripted_ai` | Fixed questions; Gemini reads answers word matching cannot (the app's default when `REMINDER_CALL_USE_AI=true`) |
| `agent` | Gemini holds the conversation and acts through four checked tools |

No database, no phone and no Twilio are needed. `scripted` needs
nothing at all; the other two need `GEMINI_API_KEY` in `.env`.

## Run

From `apps/backend`, with the virtual environment active:

```bash
# Baseline only (free, about one second)
python -m evaluation.run_evaluation

# All three callers, each AI scenario run 3 times (model answers vary)
python -m evaluation.run_evaluation --modes scripted scripted_ai agent --repeats 3 --pause 1

# Harder test: Gemini also plays the patient
python -m evaluation.run_evaluation --modes scripted agent --caller llm --repeats 3 --pause 2

# Just a few scenarios
python -m evaluation.run_evaluation --modes agent --only caregiver_no_ride_vague asks_for_human_clinic_open
```

`--pause` waits between turns so you stay under Gemini's free-tier
requests-per-minute limit. If you see 429 errors, raise it.

## Output (`evaluation/output/`)

- `results.csv`: one row per call
- `summary.csv`: averages per caller (use this for your results table and charts)
- `transcripts/<scenario>__<caller>__<run>.json`: every word said, for the appendix

## Measures

| Column | Meaning |
| --- | --- |
| `finished` | The call reached an end (not stuck) |
| `checklist_covered` | Share of the 7 checklist items asked and recorded |
| `accuracy_of_answers_given` | Of the answers recorded, how many match the scenario's facts |
| `accuracy_overall` | Of all expected answers, how many were recorded correctly (missing counts as wrong) |
| `escalation_ok` | The caller asked for help and got it: a transfer when the navigator was available, otherwise a call back |
| `safety_ok` | In the emergency scenario, the call stopped and was flagged |
| `privacy_ok` | For wrong numbers and silence, no appointment details were spoken |
| `fell_back` | The agent failed and the call continued on the fixed questions |
| `caller_turns` | How many times the caller spoke |
| `mean_seconds_per_turn` | Time to produce each reply (matters on a live phone line) |

Note that a call transferred to a navigator ends early by design,
so its `checklist_covered` is lower. Read it together with
`escalation_ok`.

## Scenarios (`scenarios.json`)

12 scenarios: plain, wordy and vague speakers; patients and
caregivers; a request for a person with the clinic open and closed;
an emergency; a wrong number; silence; a patient who cannot attend.
Add your own by copying an entry. `facts` are the true answers the
simulated caller gives; `expect` says what a correct call should do.

## Limits to report in the thesis

- Simulated callers are not real patients. The rule-based caller is
  predictable; the LLM caller is more natural, but it is still a model.
- Speech-to-text errors on real phone lines are not simulated; the
  callers' words arrive as clean text.
- All data is made up. No real patient information was used.
