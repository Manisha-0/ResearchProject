# Compass: what was built, how to run it, how to connect Twilio

This guide covers the thesis version of Compass: the reminder calls
(fixed-question caller and AI agent caller), hand-over to the patient's
navigator, call-back routing, the new interface, and the evaluation.

---

## 1. What Compass does now

Compass helps cancer patients, many of them older or with low literacy,
get to their treatment. Two days before each visit it phones the
patient (or the family member who answers), reminds them of the visit,
and asks about the things that most often stop people from coming:
a ride, medicines, how they feel, and cost. The answers go straight
into the patient's record, and the navigator sees who needs help first.

### New since the hackathon

| Area | What was added |
| --- | --- |
| Reminder calls | Automatic calls for every visit in the next 48 hours, by phone (Twilio) or as a practice call in the browser |
| Two callers | **Fixed questions**: same questions, same order. **AI agent**: Gemini holds a natural conversation and follows a checklist |
| Ask for a person | At any point the caller can ask for a human. During clinic hours they are put through to **their own navigator's phone**; otherwise a call back is booked |
| Call-back routing | Each request becomes a navigation need with a topic, urgency and due time, and says who should call (nurse, coverage navigator...) |
| Call records | Full transcript, summary, who answered, which caller, transfer outcome; on the Reminder calls page and in Patient 360 |
| Safety | Emergency words stop the call and say to call 911 (988 for self-harm); no details shared until it is confirmed who answered |
| Interface | New design built for low-vision and older users (Atkinson Hyperlegible font, bundled), redesigned patient home, navigator list and landing page |
| Evaluation | 12 made-up scenarios comparing three callers, with CSV results for the thesis |
| Tests | 51 automated tests |

---

## 2. How one reminder call works

```text
Visit in the next 48 hours
        |
        v
Compass calls the patient  (Twilio phone call, or practice call in the browser)
        |
        v
"Am I speaking with Maria, or with someone who helps Maria?"
        |-- wrong person / silence  -> polite goodbye, no details shared
        v
Reminder of the visit, then the checklist:
  can you come? | ride? | medicines? | feeling 0-10? | cost? | anything else? | call back?
        |
        |-- emergency words  -> "call 911", call flagged URGENT, urgent call back
        |-- "can I talk to a person?"
        |        |-- clinic open + navigator has a phone -> put through to the navigator
        |        |-- otherwise -> call back booked, conversation continues if the caller agrees
        v
Answers saved as a check-in (source: voice call)
        |
        v
Existing rules engine -> navigation needs -> attention status -> navigator's list
```

**Important design point for the defense:** AI never decides who needs
attention. The agent only *collects* answers through four checked tools.
The same rules engine used for app check-ins decides priority.

### The AI agent's guard rails (enforced in code, `call_agent.py`)

1. Emergencies are caught by fixed word rules before Gemini sees the words.
2. Gemini is not given the appointment details until identity is confirmed.
3. It can only act through `confirm_identity`, `save_answer`, `request_human`, `end_call`.
   Every call is checked; wrong values are rejected.
4. It cannot end the call while checklist items are missing (unless the caller declines).
5. If Gemini fails or is too slow for a phone line, the call carries on with the fixed questions.

---

## 3. Where things are in the code

### Backend (`apps/backend`)

| File | What it does |
| --- | --- |
| `app/services/call_script.py` | Fixed-question caller, word matching, emergency detection, summaries |
| `app/services/call_agent.py` | AI agent caller: prompt, tools, guard rails, Gemini connection |
| `app/services/call_interpreter.py` | Gemini reads unclear answers for the fixed-question caller |
| `app/services/reminder_call_service.py` | Saves calls, picks the caller, finds the assigned navigator, clinic hours, creates check-ins and call-back signals |
| `app/services/twilio_service.py` | Starts phone calls, TwiML (speak / listen / transfer), checks Twilio signatures |
| `app/services/context_engine.py` | `evaluate_callback_need`: turns call-back requests into needs with due times |
| `app/routers/reminder_calls.py` | API for the navigator pages, Twilio webhooks, cron endpoint |
| `app/models/reminder_call.py` | The `reminder_calls` table |
| `alembic/versions/3b7e21c4d9a0_*`, `7c2d9e5f1a44_*` | Database changes |
| `evaluation/` | Scenarios, simulated callers, `run_evaluation.py` |
| `tests/` | `test_call_script.py` (32), `test_call_agent.py` (19) |

### Frontend (`apps/web/src`)

| File | What it does |
| --- | --- |
| `app/navigator/calls/page.tsx` | Reminder calls page: visits in the next 48 h, choose the caller, practice or phone call |
| `components/calls/CallSimulator.tsx` | Practice call in the browser (speaks and listens in Chrome) |
| `components/calls/CallRecordDialog.tsx` | Full call record and transcript |
| `components/calls/PatientCallHistory.tsx` | Call history on Patient 360 |
| `app/patient/page.tsx`, `components/patient/*` | Redesigned patient home |
| `app/page.tsx` | Landing page (the two-day story) |
| `app/globals.css` | Colors, font, the appointment card style |

---

## 4. Run it on your computer (Windows)

You need **Python 3.13**, **Node.js 20.9+**, and your own **Supabase** project.

### 4.1 Backend `.env` (`apps/backend/.env`)

Use your own Supabase, Gemini and (later) Twilio values. Start from
`.env.example`. The important lines:

```env
APP_ENV=development
DATABASE_URL=postgresql+psycopg://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_STORAGE_BUCKET=compass
SUPABASE_S3_ENDPOINT=https://YOUR_REF.storage.supabase.co/storage/v1/s3
SUPABASE_S3_REGION=us-east-1
SUPABASE_S3_ACCESS_KEY_ID=...
SUPABASE_S3_SECRET_ACCESS_KEY=...
FRONTEND_URL=http://localhost:3000
ACTIVATION_URL=http://localhost:3000/activate
JWT_SECRET_KEY=a-long-random-string
BOOTSTRAP_ORGANIZATION_NAME=Hammond Cancer Navigation
BOOTSTRAP_ORGANIZATION_SLUG=hammond
BOOTSTRAP_ADMIN_EMAIL=you@example.com
BOOTSTRAP_ADMIN_PASSWORD=ChooseAStrongPassword1!
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash
EMAIL_PROVIDER=console

# Reminder calls
CLINIC_TIMEZONE=America/Chicago
REMINDER_CALL_USE_AI=true
REMINDER_CALL_MODE=agent          # caller used by automatic calls: scripted or agent
CLINIC_HOURS_START=9              # live transfers only Mon-Fri in these hours
CLINIC_HOURS_END=17
```

### 4.2 First-time setup (terminal 1)

```powershell
cd compass\apps\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
python -m app.seed.bootstrap
python -m app.seed.dev_seed      # optional demo accounts, password Demo123!
```

If PowerShell blocks `Activate.ps1`, run once:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### 4.3 Every time

Terminal 1 (backend):
```powershell
cd compass\apps\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Terminal 2 (frontend):
```powershell
cd compass\apps\web
npm install        # first time only
npm run dev
```

Open http://localhost:3000.

### 4.4 Accounts and data

* Sign in as the admin (your `BOOTSTRAP_ADMIN_*`), create a navigator and
  **enter their phone number** (`+1...`). Transfers go to this number.
* With `EMAIL_PROVIDER=console`, each new account's activation link is printed
  in the **backend terminal** ("COMPASS INVITATION EMAIL"). Open it to set a password.
* As the navigator, **Add patient** with a phone number such as `+19855550117`,
  then open the patient and **Schedule** a visit within the next 2 days.
* To give an existing navigator a phone: Supabase → Table Editor →
  `navigator_profiles` → `phone`.

---

## 5. Try the calls without Twilio (free)

1. Sign in as the navigator → **Reminder calls**.
2. Under **Who makes the call**, pick **Fixed questions** or **AI agent**.
3. Press **Practice call** on a visit. In Chrome, allow the microphone; you can
   speak, type, or tap the answer buttons.
4. Try: answer as "her daughter"; say "no" to the ride; ask "Can I talk to a real
   person?" (AI agent); say "I have chest pain" (both callers stop and flag it).
5. Close the call and press **Read call** to see the record. Open the patient to
   see the new check-in and call-back need.

Practice calls use exactly the same conversation code as phone calls.

---

## 6. Connect Twilio (real phone calls)

### 6.1 What it costs

* **Free trial:** about 75 voice minutes, 30 days, no card. Calls only to
  phone numbers you verify (up to 5), US only.
* **After the trial:** about $1.15/month for the number and roughly
  $0.20 per reminder call. $20 of credit is plenty for a thesis.
* **Tip:** start the trial about two weeks before your defense.

### 6.2 Create the account

1. Sign up at twilio.com and verify your own mobile number.
2. In the Console, get a **phone number** (the trial offers one free).
3. Under **Phone Numbers → Manage → Verified Caller IDs**, add every phone that
   should *receive* calls: the "patient" phone for testing **and the navigator's
   phone** (on a trial, transfers can only go to verified numbers too).
4. On the Console home page, copy the **Account SID** and **Auth Token**.

### 6.3 Make your backend reachable from the internet

Twilio has to send each spoken answer to your backend, so it needs a public
address. On your computer, use ngrok (free):

```powershell
# once: install from ngrok.com, then
ngrok config add-authtoken YOUR_NGROK_TOKEN

# every time, in a third terminal, while the backend runs on port 8000
ngrok http 8000
```

Copy the `https://....ngrok-free.app` address it shows.

### 6.4 Add Twilio to `.env`

```env
PUBLIC_API_URL=https://your-address.ngrok-free.app
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1XXXXXXXXXX     # your Twilio number
```

* `PUBLIC_API_URL`: no slash at the end, and it must be the exact current ngrok
  address. The free ngrok address changes each time you restart ngrok, so update
  it and restart the backend whenever it does.
* You do **not** need to set a webhook on the Twilio number. Compass tells
  Twilio the addresses with each call.

Restart the backend. The yellow "Phone calls are off" note disappears and a
**Call** button appears on the Reminder calls page.

### 6.5 First real call

1. Make sure the test patient's phone number is a verified number, in `+1...` form.
2. Pick the caller (Fixed questions or AI agent) and press **Call**.
3. Your phone rings. On a trial account, Twilio may first play a short trial
   notice and ask you to press a key; press any key, then the Compass call starts.
4. Answer out loud, or use the keypad (1 = yes, 2 = no, numbers for 0-10).
5. The page refreshes every 15 seconds; press **Read call** for the transcript.

### 6.6 Test the transfer to the navigator

1. Set the navigator's phone to a **second verified phone** (a friend's, or your
   own second phone).
2. Run the call during clinic hours (`CLINIC_HOURS_*`, Monday-Friday,
   `CLINIC_TIMEZONE`). For an evening test, temporarily set `CLINIC_HOURS_END=23`.
3. With the **AI agent** caller, say "Can I talk to a real person?".
4. The navigator's phone rings. Answer it: you are connected. Don't answer it:
   the caller hears that the navigator will call back, and a call-back need appears
   on the patient's record.

### 6.7 Automatic calling

Either:
* `REMINDER_CALL_AUTO_DIAL=true` in `.env`: the backend checks every 30 minutes
  (`REMINDER_CALL_POLL_MINUTES`) and calls patients who are due. No-answers are
  retried after 2 hours, up to 2 tries.
* Or call `POST /reminder-calls/run-due` with header `X-Cron-Secret: <REMINDER_CALL_CRON_SECRET>`
  from any scheduler (useful if your host sleeps).

Automatic calls use `REMINDER_CALL_MODE` (`scripted` or `agent`).

### 6.8 If something goes wrong

| What you see | Usual cause and fix |
| --- | --- |
| "Could not place the call: ... unverified" | Trial account: verify the number under Verified Caller IDs |
| Phone rings, then "an application error has occurred" | Twilio could not reach your backend. Check ngrok is running and `PUBLIC_API_URL` matches it exactly; restart the backend after changing it |
| Backend log: "Rejected Twilio webhook with a bad signature" | `PUBLIC_API_URL` is different from the address Twilio used (old ngrok URL, `http` vs `https`, trailing slash) |
| The call never hears answers | Speak after the question finishes; use the keypad as a fallback. Check the Twilio Console call log for errors |
| No Call button | One of the four Twilio values is missing, or the backend was not restarted |
| Transfer never happens | Navigator has no phone, it is outside clinic hours, or the call used Fixed questions (only the AI agent transfers mid-call) |
| Agent replies feel slow | Each turn calls Gemini; that is expected. If it is too slow it falls back to fixed questions automatically |

Twilio Console → **Monitor → Logs → Calls** shows every call and any error code.

---

## 7. Evaluation for the thesis

From `apps/backend`, with the virtual environment active:

```powershell
python -m evaluation.run_evaluation                                   # baseline, free
python -m evaluation.run_evaluation --modes scripted scripted_ai agent --repeats 3 --pause 1
```

Results land in `apps/backend/evaluation/output/` (`summary.csv` for your table).
Details and the meaning of each measure: `apps/backend/evaluation/README.md`.

The fixed-question baseline already shows the research gap: plain answers are read
correctly, but accuracy drops to about 29% when callers answer vaguely
("my grandson usually handles that"). The evaluation measures how much the AI
agent closes that gap, and whether it stays safe (emergencies, privacy) and
escalates correctly.

---

## 8. Tests

```powershell
cd compass\apps\backend
pip install pytest
python -m pytest tests -q        # 51 passed
```

No internet or Gemini key is needed; the agent tests use a fake model.

---

## 9. Limits to state honestly

* All patient data is made up. Real patient calls would need HIPAA agreements
  (a BAA) with Twilio and the AI provider; the free Gemini key must not receive
  real health information.
* Calls are English only.
* Simulated callers in the evaluation are not real patients, and real phone-line
  speech recognition errors are not simulated.
* The AI agent waits for each full answer (1-3 s pauses); a fully real-time voice
  would be future work.
