# Compass

**Cancer care navigation that helps patients reach their treatment, and helps navigators see who needs them first.**

> Compass doesn't replace the cancer navigator. It gives every navigator a safety net.

Compass brings together three people around one cancer care journey: the **patient**, the **caregiver** who helps them, and the **navigator** who coordinates their care. Patients and caregivers report how things are going. Compass turns those reports into a clear, explainable work queue so the navigator can act before a barrier becomes a missed treatment.

This project started at the **DevDays Cancer Care & Prevention Challenge** (in partnership with Ochsner Health) and is being extended as an MS thesis in Integrated Science and Technology at Southeastern Louisiana University.

---

## The problem

Cancer patients run into barriers throughout treatment:

- No ride to the appointment
- Trouble getting or paying for medicines
- Side effects and symptoms between visits
- Money and insurance worries
- Confusing schedules and care documents

Many patients, especially older, rural or low-literacy patients, are not comfortable with apps or websites. Navigators, meanwhile, manage large patient panels and often learn about a barrier only after the appointment is missed.

---

## What Compass does

### For patients
- See what already happened, where they are now, and what comes next in their care journey
- Upcoming appointments and care documents, with plain-language summaries
- A short check-in: symptoms, ride, medicines, money worries, and "please call me"
- After checking in, the page shows what they answered today instead of an empty form

### For caregivers
- Access only after the navigator invites them and the patient approves
- The patient chooses what the caregiver can see and do
- Every entry made by a caregiver is recorded as theirs

### For navigators
- A work queue that puts patients into **Needs attention**, **Follow up** or **On track**, with the reason shown
- Patient 360: journey, appointments, documents, check-ins and open needs in one place
- Tasks, an administrative brief, and a Copilot for record-grounded questions
- **Reminder calls** (new): see who has treatment in the next 48 hours and whether they have been reached

### For admins
- Create navigators and manage the organization; accounts are activated by invitation link

---

## New: reminder calls before treatment

Two days before an appointment, Compass calls the patient (or whoever answers for them) and asks the same questions as the check-in, by voice. It is designed for patients who will never open an app.

```text
Appointment within 48 hours
        ↓
Compass places the call
        ↓
Confirms who answered (patient, caregiver, or wrong person)
        ↓
Asks: attending? ride? medicines? symptoms 0–10? cost worries? anything else?
        ↓
Answers saved as a check-in  →  rules update the navigator's work queue
        ↓
Asked for a person?  →  transfer to the assigned navigator (clinic hours)
                         or book a callback with an urgency level
```

There are two ways to run the call, and the navigator chooses:

| | Fixed questions | AI agent |
|---|---|---|
| How it talks | Same questions in the same order | Natural conversation (Google Gemini with tools) |
| Vague answers | Asks once more, then moves on | Understands "my grandson usually drives me" |
| If something fails | — | Falls back to the fixed questions mid-call |

**Safety rules enforced in code, not left to the AI:**
- Emergencies (chest pain, trouble breathing, thoughts of self-harm) are detected *before* the AI sees the answer, and the caller is told to call 911 or 988
- No appointment details are shared until the person's identity is confirmed
- The AI only collects answers; the rules engine decides priority
- Every call is saved with its full transcript, summary and outcome

Calls can be practiced in the browser (free, uses your microphone and speakers) or placed to real phones through Twilio.

---

## How priority works

Priority is decided by **transparent rules**, not by AI. Each rule looks at the patient's open signals and upcoming appointments and creates a navigation need with an explanation, for example:

- Treatment soon and no confirmed ride → **Needs attention**
- Severe symptom reported → **Needs attention**
- Medication access or financial concern → **Follow up**
- Callback requested: urgent / today → **Needs attention**; routine → **Follow up**
- Missed appointment → **Needs attention**

The navigator always sees *why* a patient is in a group. Compass calls this navigation priority, not clinical risk. It does not diagnose or predict outcomes.

---

## Architecture

```text
Next.js (web)  ──►  FastAPI (Python)  ──►  PostgreSQL (Supabase)
                        │
                        ├── Rules engine ──► navigation needs + priority
                        ├── Reminder calls ──► Twilio (voice) / browser practice
                        │                └──► Gemini (AI agent, optional)
                        ├── Copilot, document summaries
                        ├── Supabase Storage (documents)
                        └── Audit log, role-based access
```

**Tech:** Next.js 16, React 19, Tailwind CSS 4 · FastAPI, SQLAlchemy 2, Alembic · PostgreSQL on Supabase · Google Gemini (`google-genai`) · Twilio Voice

**Roles:** super admin, navigator, patient, caregiver. Each signs in to their own workspace; access is enforced on the server.

---

## Repository structure

```text
apps/
├── backend/                 FastAPI service
│   ├── app/
│   │   ├── routers/         API endpoints (reminder_calls.py, check_ins.py, ...)
│   │   ├── services/        rules engine, call script, AI agent, Twilio, ...
│   │   ├── models/          database tables
│   │   └── seed/            first admin + demo accounts
│   ├── alembic/             database migrations
│   ├── evaluation/          scripted vs AI caller evaluation
│   └── tests/
└── web/                     Next.js app
    └── src/
        ├── app/             pages: patient, caregiver, navigator, admin
        └── components/
GUIDE.md                     full setup guide, including Twilio
```

---

## Running it locally

You need Python 3.13, Node.js 20.9+, and a PostgreSQL database (a free Supabase project works). Full step-by-step instructions, including Windows and Twilio, are in **[GUIDE.md](GUIDE.md)**.

**Backend**

```bash
cd apps/backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # then fill in database, Gemini key, etc.
alembic upgrade head
python -m app.seed.bootstrap      # creates the first admin from .env
python -m app.seed.dev_seed       # optional demo accounts (password Demo123!)
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000 and sign in.

New accounts are activated by invitation. With `EMAIL_PROVIDER=console`, the activation link is printed in the backend terminal.

---

## Demo flow

1. **Navigator** signs in and opens the work queue and a patient's journey.
2. **Patient** signs in, sees the journey, and checks in: severe nausea, not sure about a ride.
3. **Navigator** sees the patient move to *Needs attention*, with the reason.
4. **Navigator** opens *Reminder calls* and runs a practice call with the AI agent, answering as a caregiver who asks for a callback.
5. The call record shows the transcript and summary; the callback appears in the work queue.
6. **Navigator** resolves the ride; the patient moves back toward *On track*.

---

## Evaluation and tests

The `evaluation/` folder runs 12 simulated calls (clear answers, vague answers, caregivers, wrong person, silence, emergencies, requests for a person) and compares the fixed-question caller with the AI agent on answer accuracy, escalation and safety.

```bash
cd apps/backend
python -m evaluation.check_gemini                              # is the AI agent working?
python -m evaluation.run_evaluation --modes scripted agent --pause 5
python -m pytest tests -q                                      # unit tests
```

---

## Data, privacy and limits

- All patient data is **synthetic**. No real patient information is used.
- This is a research prototype, not a HIPAA-compliant production system.
- A Twilio trial account can only call verified numbers and limits call features; real deployment needs an upgraded account.
- The AI agent has been tested with simulated callers, not real patients.
- Navigation priority comes from explainable rules and has not been clinically validated.

Compass does **not** diagnose, recommend treatment or medication, predict hospitalization, or replace clinicians or navigators. Humans remain responsible for every care decision.

---

## Contributors

Built at DevDays by Anish Gyawali, Manisha Basukala and Srishti. Reminder calls, AI agent, evaluation and the redesigned interface added by Manisha Basukala as part of her MS thesis.

**Every cancer journey is different. No patient should have to navigate the gaps alone.**
