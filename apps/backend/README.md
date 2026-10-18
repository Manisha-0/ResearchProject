# Project Compass

Project Compass is a care-navigation prototype that helps navigators turn patient, caregiver, care-plan, and system signals into an explainable work queue.

Compass does **not** calculate clinical risk, diagnose patients, or replace care-team judgment.

Current functionality includes:

* Navigator dashboard
* Patient 360
* Patient daily check-ins
* Caregiver portal
* Caregiver proxy check-ins
* Care journey and appointments
* Navigation signals
* Navigation needs
* Attention status
* Navigator task workflow
* Resolution history
* Role-based authentication
* Audit logging

---

# Tech Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Zustand

Frontend directory:

```bash
apps/web
```

## Backend

* FastAPI
* SQLAlchemy
* PostgreSQL
* Alembic
* JWT authentication

Backend directory:

```bash
apps/backend
```

## Database

Compass uses a hosted PostgreSQL database through **Supabase**.

Supabase is currently used only for PostgreSQL hosting.

We are **not using Supabase Auth**.

Authentication and authorization are handled by FastAPI.

---

# Quick Local Setup

The overall setup is:

```text
Clone repository
    ↓
Create Supabase project
    ↓
Copy DATABASE_URL
    ↓
Configure backend .env
    ↓
Install backend dependencies
    ↓
Run Alembic migrations
    ↓
Run bootstrap
    ↓
Run development seed
    ↓
Start FastAPI
    ↓
Install frontend dependencies
    ↓
Configure frontend .env.local
    ↓
Start Next.js
```

---

# 1. Clone the Repository

```bash
git clone https://github.com/anish-gyawali/compass.git
cd compass
```

Switch to the development branch:

```bash
git checkout dev
```

Pull the latest changes:

```bash
git pull origin dev
```

---

# 2. Create a Supabase Project

Create a project in Supabase.

After the project is ready, open the database connection settings.

Depending on the Supabase interface, this can usually be found under:

```text
Connect
→ Database
```

or:

```text
Project Settings
→ Database
→ Connection string
```

Copy the PostgreSQL connection string.

For local development, the **Session Pooler** connection string is often the easiest choice.

It may look similar to:

```text
postgresql://postgres.<project-ref>:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

or:

```text
postgresql://postgres:YOUR_PASSWORD@db.<project-ref>.supabase.co:5432/postgres
```

Replace the password placeholder with the database password created for the Supabase project.

---

# 3. Configure the Backend

Go to:

```bash
cd apps/backend
```

Create a `.env` file.

Example:

```env
APP_ENV=development

DATABASE_URL=YOUR_SUPABASE_DATABASE_URL

JWT_SECRET_KEY=change-this-for-local-development
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

BOOTSTRAP_ORGANIZATION_NAME=Compass Demo Health System
BOOTSTRAP_ORGANIZATION_SLUG=compass-demo

BOOTSTRAP_ADMIN_EMAIL=admin@compass.demo
BOOTSTRAP_ADMIN_PASSWORD=Demo123!
```

If the repository contains an `.env.example`, use that as the source of truth for all required variables.

Do not commit:

```text
.env
.env.local
```

or any real Supabase password to GitHub.

---

# 4. Create the Python Virtual Environment

From:

```bash
apps/backend
```

## macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## Windows PowerShell

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# 5. Check the Alembic Migration State

Before applying migrations, it is useful to inspect the database state.

From:

```bash
apps/backend
```

run:

```bash
alembic current
```

This shows the migration revision currently applied to the database.

To see the latest migration revision available in the codebase:

```bash
alembic heads
```

You can also inspect migration history with:

```bash
alembic history
```

On a brand-new Supabase database, `alembic current` may show no applied revision yet.

---

# 6. Apply Database Migrations

Run:

```bash
alembic upgrade head
```

This creates or updates the Compass database schema in Supabase.

Then verify:

```bash
alembic current
```

and:

```bash
alembic heads
```

After a successful migration, the revision shown by:

```bash
alembic current
```

should match the current Alembic head.

A useful verification sequence is:

```bash
alembic current
alembic heads
alembic upgrade head
alembic current
```

---

# 7. Run the Bootstrap Seed

Compass requires the base organization/bootstrap records before development demo users can be created.

From:

```bash
apps/backend
```

run:

```bash
python -m app.seed.bootstrap
```

The bootstrap step creates the base Compass organization and bootstrap account/configuration needed by the development seed.

Run this before:

```bash
python -m app.seed.dev_seed
```

because the development seed expects the organization to already exist.

---

# 8. Seed Development Demo Data

After migrations and bootstrap are complete, run:

```bash
python -m app.seed.dev_seed
```

The development seed only runs when:

```env
APP_ENV=development
```

is configured.

If `APP_ENV` is not set to `development`, the seed intentionally stops.

The seed creates the primary synthetic demo users.

## Navigator

```text
Email: james@compass.demo
Password: Demo123!
```

Name:

```text
James Wilson
```

Role:

```text
Cancer Navigator
```

---

## Patient

```text
Email: anisha@compass.demo
Password: Demo123!
```

Name:

```text
Anisha Sharma
```

Care program:

```text
Breast Cancer Navigation
```

---

## Caregiver

```text
Email: aarti@compass.demo
Password: Demo123!
```

Name:

```text
Aarti Sharma
```

Relationship:

```text
Daughter
```

The seeded caregiver relationship is already active and currently includes these permissions:

```text
Appointments
Transportation
Care Tasks
Proxy Check-In
```

All development/demo records are synthetic.

---

# 9. Database Initialization Summary

For a completely new database, run these commands from:

```bash
apps/backend
```

in this order:

```bash
alembic current
alembic heads

alembic upgrade head

alembic current

python -m app.seed.bootstrap

python -m app.seed.dev_seed
```

That is the recommended setup sequence.

In short:

```text
Migration
    ↓
Bootstrap
    ↓
Development Seed
```

---

# 10. Verify the Supabase Database

After running migrations and seeds, open:

```text
Supabase
→ Table Editor
```

You should see tables such as:

```text
organizations
users
navigator_profiles
patient_profiles
caregiver_profiles
navigator_patient_assignments
caregiver_patient_access
caregiver_permissions
care_journey_items
appointments
check_ins
navigation_signals
navigation_needs
navigation_tasks
attention_snapshots
audit_logs
```

Additional tables may exist depending on the latest migration.

You can also confirm that seeded users exist in the `users` table.

---

# 11. Start the Backend

From:

```bash
apps/backend
```

with the virtual environment active:

```bash
uvicorn app.main:app --reload
```

The backend should be available at:

```text
http://localhost:8000
```

FastAPI documentation:

```text
http://localhost:8000/docs
```

Opening `/docs` is an easy way to confirm the API started correctly.

---

# 12. Configure the Frontend

Open another terminal and go to:

```bash
cd apps/web
```

Install dependencies:

```bash
npm install
```

Create:

```text
.env.local
```

Add:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

# 13. Start the Frontend

From:

```bash
apps/web
```

run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Full First-Time Setup

## Backend

```bash
cd apps/backend

python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

alembic current
alembic heads

alembic upgrade head

alembic current

python -m app.seed.bootstrap
python -m app.seed.dev_seed

uvicorn app.main:app --reload
```

For Windows PowerShell, activate the environment with:

```powershell
.venv\Scripts\Activate.ps1
```

instead of:

```bash
source .venv/bin/activate
```

---

## Frontend

In a second terminal:

```bash
cd apps/web

npm install

npm run dev
```

Then open:

```text
http://localhost:3000
```

---

# If You Already Have Compass Running

When another developer pulls new changes:

```bash
git checkout dev
git pull origin dev
```

Update backend dependencies:

```bash
cd apps/backend
source .venv/bin/activate

pip install -r requirements.txt
```

Check migration state:

```bash
alembic current
alembic heads
```

Apply any new migrations:

```bash
alembic upgrade head
```

Verify:

```bash
alembic current
```

Then start the backend:

```bash
uvicorn app.main:app --reload
```

For the frontend:

```bash
cd apps/web

npm install
npm run dev
```

Running `npm install` again is safe and ensures newly added dependencies are installed.

---

# When New Database Migrations Are Pulled

If someone adds a new Alembic migration and pushes it to `dev`:

```bash
git pull origin dev
```

Then:

```bash
cd apps/backend
source .venv/bin/activate
```

Check where your database currently is:

```bash
alembic current
```

Check the latest revision in the repository:

```bash
alembic heads
```

Upgrade:

```bash
alembic upgrade head
```

Verify again:

```bash
alembic current
```

Normally you do **not** need to recreate the Supabase database.

---

# Should Every Developer Use the Same Supabase Database?

Not necessarily.

For local development, each developer can create their **own Supabase project**.

Recommended:

```text
Developer A
    ↓
Own Supabase project

Developer B
    ↓
Own Supabase project
```

Each developer then runs:

```bash
alembic upgrade head
python -m app.seed.bootstrap
python -m app.seed.dev_seed
```

This gives everyone the same schema and the same synthetic demo accounts without sharing database passwords.

---

# Supabase DATABASE_URL Setup

The important backend variable is:

```env
DATABASE_URL=
```

The value comes from the Supabase PostgreSQL connection information.

Typical process:

```text
Create Supabase project
    ↓
Open Connect / Database settings
    ↓
Copy PostgreSQL connection string
    ↓
Insert your database password
    ↓
Place it in apps/backend/.env
```

Example format:

```env
DATABASE_URL=postgresql://postgres.projectref:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

The exact hostname varies by project and region.

Do not copy another developer's database password into GitHub.

---

# Troubleshooting

## `alembic current` Shows Nothing

If this is a brand-new database, this can be normal.

Run:

```bash
alembic upgrade head
```

Then:

```bash
alembic current
```

---

## `alembic current` Does Not Match `alembic heads`

Run:

```bash
alembic upgrade head
```

Then verify:

```bash
alembic current
alembic heads
```

---

## Development Seed Says `Run bootstrap first.`

Run:

```bash
python -m app.seed.bootstrap
```

Then:

```bash
python -m app.seed.dev_seed
```

---

## Development Seed Says It Can Only Run in Development

Make sure:

```env
APP_ENV=development
```

exists in:

```text
apps/backend/.env
```

Then rerun:

```bash
python -m app.seed.dev_seed
```

---

## Database Connection Error

Check:

```env
DATABASE_URL=
```

Make sure:

* The Supabase project is running.
* The password is correct.
* The connection string belongs to the correct project.
* Special characters in the password are URL encoded if necessary.
* The `.env` file is inside `apps/backend`.

If direct database connectivity does not work from the local network, use the Supabase pooler connection string.

---

## Backend Starts but Frontend Cannot Connect

Make sure FastAPI is running at:

```text
http://localhost:8000
```

Verify the frontend has:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Then restart Next.js:

```bash
npm run dev
```

---

## New Backend Changes Were Pulled

Run:

```bash
pip install -r requirements.txt
alembic upgrade head
```

---

## New Frontend Changes Were Pulled

Run:

```bash
npm install
npm run dev
```

---

# Demo Accounts

| Role      | Email                 | Password   |
| --------- | --------------------- | ---------- |
| Navigator | `james@compass.demo`  | `Demo123!` |
| Patient   | `anisha@compass.demo` | `Demo123!` |
| Caregiver | `aarti@compass.demo`  | `Demo123!` |

All demo identities and data are synthetic.

---

# Current Demo Workflow

A useful end-to-end test is:

```text
Anisha logs in
    ↓
Submits a check-in
    ↓
Navigation signals are created
    ↓
Navigation needs are contextualized
    ↓
Attention status updates
    ↓
James logs in
    ↓
Navigator dashboard shows Anisha
    ↓
James opens Patient 360
    ↓
Creates a navigator task
    ↓
Starts the task
    ↓
Completes it with a resolution note
    ↓
Linked navigation need resolves
    ↓
Resolution appears in Patient 360 history
```

Caregiver workflow:

```text
Aarti logs in
    ↓
Views authorized patient information
    ↓
Submits an allowed caregiver update
    ↓
Caregiver check-in is stored
    ↓
James sees that evidence in Patient 360
```

---

# Compass Workflow Model

```text
Care Journey
     +
Patient Signals
     +
Caregiver Signals
     +
System Signals
     ↓
Navigation Signals
     ↓
Navigation Needs
     ↓
Attention Status
     ↓
Navigator Task
     ↓
Human Action
     ↓
Resolution
```

Compass supports care-navigation workflow.

It does not make clinical decisions.

---

# Development Notes

* Active development is currently on the `dev` branch.
* Supabase provides PostgreSQL hosting.
* FastAPI owns authentication and authorization.
* Supabase Auth is not currently used.
* The frontend communicates with FastAPI rather than directly with Supabase.
* Demo data is synthetic.
* Caregiver access is relationship- and permission-scoped.
* Navigation signals are evidence.
* Navigation needs are contextualized coordination problems.
* Attention status represents workflow urgency, not clinical risk.
* Navigation tasks represent navigator actions.
* Completed tasks remain stored as resolution history.
* Audit logs are separate from navigator-facing resolution history.

---

# Appointment reminder calls

Compass calls every patient who has a scheduled appointment in the next
48 hours. The call is meant for patients who find apps and websites hard
to use. A family member or caregiver can answer for them.

## What the call asks

1. Who is speaking (the patient, or someone helping them). No appointment
   details are shared until this is confirmed.
2. A reminder of the appointment (what, when, where, with whom), then:
   can you make it?
3. Do you have a ride?
4. Any trouble getting medicines?
5. How are you feeling, from 0 to 10?
6. Any worries about cost or insurance?
7. Anything else the care team should know?
8. Would you like a navigator to call back?

The caller can answer by voice or with the keypad (1 = yes, 2 = no,
numbers for the 0-10 scale). Unclear answers are asked once more, then
skipped. If the caller mentions an emergency (for example chest pain or
trouble breathing) or self-harm, the call stops, they are told to call
911 (and 988 for self-harm), and the call is flagged as urgent.

## How it fits the existing design

```text
Twilio phone call  ─┐
                    ├─► call_script.py (fixed questions)
Browser simulator  ─┘        │
                             │  answer unclear?  ──► Gemini picks one allowed value
                             ▼
                    reminder_calls table (transcript + answers + summary)
                             │
                             ▼
                    CheckIn (source = voice_call)
                             │
                             ▼
              existing signal_service + context_engine rules
                             │
                             ▼
                    Navigation needs / attention status
```

AI never decides priority. Gemini is only used to understand an answer
that simple word matching could not, and it may only return a value from
a short fixed list. Everything after that is the same rules engine used
for app check-ins.

Files:

| File | Purpose |
| --- | --- |
| `app/services/call_script.py` | The conversation. No database code, fully unit tested. |
| `app/services/call_interpreter.py` | Gemini fallback for unclear answers. |
| `app/services/reminder_call_service.py` | Saves state and transcript, creates the check-in, finds who is due. |
| `app/services/twilio_service.py` | Starts calls, builds TwiML, checks Twilio signatures. |
| `app/routers/reminder_calls.py` | Navigator API, Twilio webhooks, cron endpoint. |
| `alembic/versions/3b7e21c4d9a0_add_reminder_calls.py` | New table and the `voice_call` check-in source. |
| `tests/test_call_script.py` | 32 tests covering answers, caregiver calls, wrong person, silence, emergencies. |

## Run the migration

```bash
alembic upgrade head
```

## Try it without a phone (practice calls)

Nothing extra is needed. Sign in as a navigator, open **Reminder calls**,
and press **Practice call** on any visit. Chrome or Edge will speak the
questions out loud and listen through the microphone; you can also type
or tap answers. Practice calls are saved like real calls.

## Real phone calls with Twilio

1. Create a Twilio account and buy a voice-capable phone number. On a
   trial account you can only call numbers you have verified in Twilio.
2. The backend must be reachable from the internet. Locally:

   ```bash
   ngrok http 8000
   ```

3. Add to `.env`:

   ```text
   PUBLIC_API_URL=https://<your-ngrok-or-render-url>
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_FROM_NUMBER=+1...
   ```

4. Restart the API. The **Call** button now appears on the Reminder calls
   page. Patient phone numbers must be in E.164 format, e.g. `+19855550117`.

## Calling automatically

Pick one:

- `REMINDER_CALL_AUTO_DIAL=true` runs a loop inside the API every
  `REMINDER_CALL_POLL_MINUTES` (default 30). Good for an always-on server.
- On hosting that sleeps (free tiers), call the endpoint from any cron job:

  ```bash
  curl -X POST https://<api>/reminder-calls/run-due \
       -H "X-Cron-Secret: $REMINDER_CALL_CRON_SECRET"
  ```

A patient who does not answer is tried again after
`REMINDER_CALL_RETRY_MINUTES` (default 120), up to
`REMINDER_CALL_MAX_ATTEMPTS` (default 2).

## Run the tests

```bash
pip install pytest
python -m pytest tests -q
```

## Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `CLINIC_TIMEZONE` | `America/Chicago` | Used when the call reads out the appointment time. |
| `REMINDER_CALL_WINDOW_HOURS` | `48` | How far ahead to look for appointments. |
| `REMINDER_CALL_USE_AI` | `true` | Use Gemini for unclear answers. `false` = word matching only. |
| `REMINDER_CALL_AUTO_DIAL` | `false` | Place calls automatically from inside the API. |
| `REMINDER_CALL_CRON_SECRET` | none | Secret for `/reminder-calls/run-due`. |
| `PUBLIC_API_URL` | `http://localhost:8000` | Public URL Twilio calls back to. |
| `TWILIO_*` | none | Twilio credentials and caller number. |

---

# Agent caller (AI conversation)

Each reminder call can be made by one of two callers:

| | Fixed questions (`scripted`) | AI agent (`agent`) |
| --- | --- | --- |
| Who decides what to ask | The script, always in the same order | Gemini, following a checklist |
| How answers are read | Word matching, then Gemini for unclear answers | Gemini, through checked tools |
| Caller asks for a person mid-call | Only at the last question | Any time: put through to their navigator, or a call back is booked |
| If Gemini fails | Keeps going with word matching | Switches to fixed questions for the rest of the call |

The navigator chooses the caller on the **Reminder calls** page
("Who makes the call"). Automatic calls use `REMINDER_CALL_MODE`.

## How the agent is kept safe

Code in `app/services/call_agent.py` enforces these, not the prompt:

1. **Emergencies** (chest pain, trouble breathing, self-harm...) are caught
   by fixed word rules *before* Gemini sees the words. The caller is told to
   call 911 (and 988), and an urgent call back is created.
2. **Privacy:** until the agent confirms who answered, Gemini is not given
   the appointment details at all, so it cannot reveal them.
3. **Four tools only:** `confirm_identity`, `save_answer`, `request_human`
   and `end_call`. Every call is checked; bad values are rejected and the
   model is told why.
4. **No early hang-up:** `end_call` is refused while checklist items are
   missing, unless the caller declined.
5. **Time limit:** if Gemini is slow (Twilio waits about 15 s), the call
   falls back to the fixed questions instead of going silent.
6. **Priority stays with the rules engine:** the agent only records answers.
   The same check-in, signals and attention rules run for both callers.

## When a caller asks for a person

```text
request_human(topic, urgency, reason)
        |
        |-- clinic open (CLINIC_HOURS_*, Mon-Fri) and navigator has a phone
        |        -> call is put through to the patient's assigned navigator (Twilio <Dial>)
        |             -> navigator answers:  transfer_status = connected
        |             -> no answer:          transfer_status = no_answer, call back booked
        |
        |-- otherwise
                 -> call back booked; the agent says who will call and when
```

A booked call back becomes a `callback_<urgency>` navigation signal. The
rule `evaluate_callback_need` in `context_engine.py` turns it into a need
on the patient's record:

| Urgency | Due in | Attention |
| --- | --- | --- |
| urgent | 2 hours | Needs attention |
| today | 8 hours | Needs attention |
| routine | 24 hours | Follow up |

The need's recommended action names who should call: clinical navigator or
nurse for symptoms; coverage / financial navigator for cost or insurance;
and so on.

**Give navigators a phone number** (navigator profile, E.164 format such as
`+19855550100`). Without one, requests always become call backs.

## Evaluation

`evaluation/` compares the callers on 12 made-up scenarios and writes CSVs
for the results chapter. See `evaluation/README.md`.

## Tests

```bash
python -m pytest tests -q     # 51 tests, no network needed
```
