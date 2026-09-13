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
