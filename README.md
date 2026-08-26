# Project Compass

## AI-Assisted Cancer Care Navigation & Early-Intervention Platform

**DevDays Cancer Care & Prevention Challenge — in partnership with Ochsner Health**

> **Compass doesn't replace the cancer navigator. It gives every navigator an intelligent safety net.**

Project Compass is a cancer care navigation platform designed to connect patient and caregiver signals with the care journey already managed by navigation teams.

Its goal is to help care teams identify navigation barriers earlier, reduce administrative burden, and put the right problem in front of the right human at the right time.

---

## Challenge

Cancer patients may encounter barriers throughout diagnosis, treatment, survivorship, and supportive care, including:

- Transportation difficulties
- Treatment authorization delays
- Medication access issues
- Side-effect and symptom concerns
- Complex appointment schedules
- Difficulty understanding care plans and documents
- Caregiver coordination
- Financial and geographic barriers

These challenges can become especially significant in rural and underserved communities.

At the same time, oncology navigation teams may manage large patient panels while coordinating appointments, records, authorizations, patient communication, social needs, and follow-up.

Compass is designed as a coordination and prioritization layer around that existing workflow.

---

# Product Vision

Compass connects three people around one patient journey:

```text
Patient
   │
   │ check-ins, concerns, questions
   ▼
Compass
   ▲
   │ appointments, documents, journey updates
   │
Navigator / Care Team

Caregiver
   │
   └── permissioned logistics and proxy support
```

The formal care journey is maintained by the navigation team.

Patients and authorized caregivers contribute patient-reported signals.

Compass brings those sources together so a navigator can understand:

> **Who may need my attention today, why, and what administrative work is still outstanding?**

---

# Core Workflow

The prototype demonstrates this end-to-end flow:

```text
Navigator creates and maintains the care journey
        ↓
Appointments and care documents are added
        ↓
Patient signs in and sees what happened and what comes next
        ↓
Patient completes a check-in
        ↓
Compass detects navigation barriers
        ↓
Navigation Priority changes
        ↓
Navigator sees the patient rise in the queue
        ↓
Patient 360 explains why
        ↓
Compass Copilot and Admin Brief organize follow-up
        ↓
Navigator resolves a navigation barrier
        ↓
Priority and patient journey update
```

The primary demo story follows **Manisha**, a synthetic patient.

---

# User Roles

## Patient

Patients receive access to the care record created for them by the navigation team.

The patient experience includes:

- Upcoming appointments
- Current stage in the care journey
- Earlier milestones
- Care-plan documents
- Plain-language document summaries
- Daily check-ins
- Transportation reporting
- Medication-access reporting
- Symptom reporting
- Free-text concerns

The patient does not need to reconstruct the cancer journey from multiple disconnected systems.

Compass provides one organized view of:

```text
What already happened
        ↓
Where I am now
        ↓
What happens next
```

---

## Caregiver

Caregivers cannot independently attach themselves to a patient.

The intended access flow is:

```text
Navigator creates invitation
        ↓
Patient approves caregiver relationship
        ↓
Patient selects permissions
        ↓
Caregiver activates Compass access
```

Permissions are scoped by category.

For example, a patient may allow a caregiver to:

- View appointments
- Coordinate transportation
- View care tasks
- Complete check-ins on the patient's behalf

while restricting:

- Clinical notes
- Navigator notes
- Other private care information

Every proxy action is designed to preserve who entered the information.

---

## Navigator

The Navigator workspace is the operational center of Compass.

Navigators can:

- Review the Care-Gap Dashboard
- See patients ranked by Navigation Priority
- Open Patient 360
- Review recent check-ins
- Understand why a patient was prioritized
- Review open and resolved care gaps
- Add appointments
- Add patient documents
- Maintain the care journey
- Review AI-assisted administrative follow-up
- Use Compass Copilot
- Resolve navigation barriers

The navigator or care team remains responsible for action and escalation.

---

# Navigation Priority

Compass deliberately separates **navigation prioritization** from AI.

The current prototype uses transparent weighted rules:

| Navigation signal         | Points |
| ------------------------- | -----: |
| Treatment within 48 hours |    +30 |
| Transportation unresolved |    +25 |
| Severe symptom reported   |    +20 |
| Authorization pending     |    +15 |
| Medication difficulty     |    +12 |

Example:

```text
Treatment within 48 hours     +30
Transportation unresolved     +25
Severe nausea reported        +20
Authorization pending         +15
                              ───
Navigation Priority            90
```

Compass calls this **Navigation Priority**, not clinical risk.

It is not intended to diagnose disease, predict hospitalization, or determine treatment.

---

# How AI Helps

AI in Compass is designed primarily to reduce information and administrative burden.

It is kept architecturally separate from the rules engine.

## 1. Navigator Summary

Compass organizes current patient signals into a concise explanation of what may require attention.

---

## 2. Administrative Brief

Compass assembles outstanding work such as:

- Transportation follow-up
- Authorization follow-up
- Medication access
- Appointment preparation
- Patient-reported changes

This allows the navigator to review an action-oriented brief instead of manually scanning the complete record.

---

## 3. Compass Copilot

The navigator can ask record-grounded questions such as:

```text
What needs attention today?

Prepare my call with Manisha.

What changed since the last check-in?
```

This version uses deterministic generation from synthetic structured data so the live demonstration remains reliable.

A finalist version can replace that generation layer with an LLM/RAG service.

---

## 4. Patient-Friendly Document Summaries

When the navigation team adds a care document, Compass can create a simpler explanation for the patient.

This is designed to reduce repeated administrative rewriting while helping patients understand what was added to their care record.

---

# Safety Architecture

Compass separates:

```text
Rules Engine
    ↓
Navigation Priority
```

from:

```text
Patient Record
    ↓
AI Summary / Copilot / Administrative Assistance
```

AI explains and organizes.

AI does **not** determine Navigation Priority.

Humans remain responsible for clinical and navigation decisions.

---

# Prototype Architecture

The prototype intentionally prioritizes the complete product workflow over production infrastructure.

```text
Next.js / React
      │
      ▼
Patient │ Caregiver │ Navigator
      │
      ▼
Zustand Application Store
      │
      ▼
Browser Persistence
      │
      ├───────────────┐
      ▼               ▼
Rules Engine     AI Prototype Layer
      │               │
      ▼               ▼
Navigation        Summaries /
Priority          Copilot /
                  Admin Brief
```

All data in the prototype is synthetic.

---

# Target Finalist Architecture

If selected for the final round:

```text
Next.js PWA
     │
     ▼
FastAPI
     │
     ├──────────────┐
     ▼              ▼
PostgreSQL     Rules Engine
     │
     ├──────────────┐
     ▼              ▼
Audit / RBAC    LLM + RAG
     │              │
     └──────┬───────┘
            ▼
        Navigator
```

Planned finalist work includes:

- PostgreSQL persistence
- FastAPI backend
- Authentication and server-enforced RBAC
- Audit logging
- LLM/RAG integration
- `pgvector`
- PWA installability
- Offline check-in queueing
- Background synchronization
- FHIR-compatible integration
- Real-time dashboard updates
- Expanded caregiver authorization workflows

---

# Data Model

The prototype models:

- Patients
- Check-ins
- Care gaps
- Appointments
- Care journey milestones
- Documents
- Caregivers
- Caregiver permissions
- Navigation Priority
- Demo sessions

The schema is intentionally structured so the frontend can later connect to a real backend without redesigning the product experience.

---

# Authentication & Role Flow

The includes a simulated login experience.

Users do not select another role after authentication.

Their workspace is determined by their authenticated role:

```text
Patient account
     ↓
Patient workspace

Caregiver account
     ↓
Caregiver workspace

Navigator account
     ↓
Navigator workspace
```

For presentation speed, the login page includes one-click demo accounts.

Manual username/password inputs remain visible to communicate the intended authentication flow.

Production Compass would use health-system identity infrastructure and server-enforced authorization.

---

# Repository Structure

```text
compass/
├── apps/
│   └── web/
│       └── Next.js -> prototype
│
├── package.json
└── README.md
```

The repository is intentionally structured so additional applications can be introduced later:

```text
apps/
├── web/
└── api/
```

---

# Running the Project

Install dependencies:

```bash
npm install
```

Start development:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Recommended Demo Flow

### 1. Open Compass

Start on the public product landing page.

### 2. Sign in as Navigator

Briefly show:

- Existing care journey
- Appointments
- Documents
- Administrative workflow

### 3. Sign out and enter Patient account

Show that Manisha sees:

- Previous milestones
- Upcoming treatment
- Documents
- Plain-language summaries

Submit:

```text
Nausea: Severe
Transportation: Not sure
Medication: On track

Note:
"I'm worried I won't have a ride tomorrow."
```

### 4. Return as Navigator

Manisha's Navigation Priority should rise to:

```text
90 · HIGH
```

Open Patient 360.

Show:

- Why she was prioritized
- Active care gaps
- Latest check-in
- AI Admin Brief
- Compass Summary
- Copilot

### 5. Resolve transportation

The transportation barrier closes and Navigation Priority decreases.

### 6. Return to Dashboard

Show that the queue automatically reflects the updated patient state.

---

# Synthetic Data & Compliance

All records shown in the prototype are synthetic.

No real patient information is used.

The prototype is not represented as a HIPAA-compliant production deployment.

The production architecture is designed around:

- Role-based access control
- Minimum-necessary caregiver access
- Audit logs
- Encryption
- Secure authentication
- Patient authorization
- BAA-supported infrastructure
- Authorized FHIR/EHR integration

---

# Disclaimer

Project Compass is a hackathon prototype.

It does not:

- Diagnose cancer
- Recommend treatment
- Recommend medication
- Predict hospitalization
- Replace clinicians
- Replace navigators

Navigation Priority is an explainable prototype rules engine and has not been clinically validated.

---

# Project Compass

**Help fewer patients fall through the gaps.**

_Every cancer journey is different. But no patient should have to navigate the gaps alone._

**Patient journey → Care gap → Early visibility → Human action → Better coordinated care**
