# Project Compass

### AI-Powered Cancer Care Navigation & Early-Intervention Platform

**DevDays Cancer Care & Prevention Challenge — in partnership with Ochsner Health**

> **Compass doesn't replace the cancer navigator. It gives every navigator an intelligent safety net.**

Project Compass is a care-navigation prototype designed to help cancer navigation teams identify patient barriers earlier and focus human attention where it is needed most.

Instead of building another patient chatbot or attempting to make clinical decisions with AI, Compass connects patient and caregiver signals to an **explainable Navigation Priority** that helps navigators answer a practical question:

> **Which patients may need my attention today, and why?**

---

## The Problem

Cancer care does not stop when a patient leaves the hospital.

Patients may face barriers such as:

* Transportation problems
* Treatment authorization delays
* Medication access issues
* Difficult symptoms
* Caregiver coordination challenges
* Financial, geographic, and social barriers

These challenges can be especially significant for patients in rural and underserved communities.

Navigation teams already help address these problems, but a navigator may be responsible for many active patients at the same time.

Compass is designed as a **triage and coordination layer for existing navigation teams**.

---

## The Core Workflow

The semifinal prototype demonstrates one complete end-to-end story:

```text
Manisha checks in
        ↓
Compass detects care gaps
        ↓
Navigation Priority becomes HIGH
        ↓
James sees Manisha at the top of his dashboard
        ↓
James opens Patient 360
        ↓
Compass explains why she needs attention
        ↓
James resolves the transportation barrier
        ↓
Manisha's Navigation Priority drops
        ↓
The dashboard updates
```

The goal is simple:

**Detect the care gap before the patient falls through it.**

---

## User Roles

Compass is designed around three connected roles.

### Patient — Manisha

The patient can:

* View the upcoming care journey
* Complete a simple daily check-in
* Report symptoms
* Report transportation status
* Report medication difficulties
* Add a free-text concern
* Share selected information with a caregiver

The patient experience is intentionally simple and mobile-friendly.

---

### Caregiver — Danielle

A caregiver is connected to a specific patient through an explicit invitation and permission model.

The intended production workflow is:

```text
Navigator creates caregiver invitation
                ↓
Patient approves the relationship
                ↓
Patient chooses permissions
                ↓
Caregiver activates access
```

Caregiver access is **category-scoped rather than all-or-nothing**.

For example, Manisha may allow Danielle to:

* View appointments
* View transportation needs
* Coordinate transportation
* View care tasks
* Submit a check-in on Manisha's behalf

while preventing access to:

* Clinical notes
* Navigator notes

A caregiver cannot independently search for and attach themselves to a patient's record.

---

### Navigator — James

The navigator receives a prioritized view of assigned patients.

The navigator can:

* View the Care-Gap Dashboard
* See patients ordered by Navigation Priority
* Open Patient 360
* Understand why a patient was prioritized
* Review patient check-ins
* Review active care gaps
* Resolve navigation barriers
* Use Compass Copilot to summarize the patient's navigation record

The human navigator remains responsible for deciding what action to take.

---

# Navigation Priority

Compass deliberately separates **priority calculation** from **AI-generated explanation**.

Navigation Priority is calculated using transparent rules rather than an opaque machine-learning model.

Current prototype rules include:

| Signal                    | Points |
| ------------------------- | -----: |
| Treatment within 48 hours |    +30 |
| Transportation unresolved |    +25 |
| Severe symptom reported   |    +20 |
| Authorization pending     |    +15 |
| Medication difficulty     |    +12 |

Example:

```text
Treatment tomorrow             +30
Transportation not confirmed   +25
Severe nausea                  +20
Authorization pending          +15
                               ───
Navigation Priority             90
```

This results in:

```text
HIGH · 90
```

The score is called **Navigation Priority**, not clinical risk.

It is not intended to diagnose disease, predict hospitalization, recommend medication, or replace clinical judgment.

---

## Compass Copilot

Compass Copilot helps the navigator understand information already contained in the patient's Compass record.

Prototype questions include:

* **What needs attention today?**
* **Prepare my call with Manisha**
* **What changed since the last check-in?**

For the semifinal prototype, Copilot responses can be generated deterministically from synthetic patient records so the demonstration remains reliable.

The intended finalist architecture replaces the response-generation layer with an LLM/RAG service while preserving the separation between AI and priority logic:

```text
Patient / Caregiver Signals
            │
            ▼
   Structured Patient Record
            │
       ┌────┴────┐
       │         │
       ▼         ▼
 Rules Engine   Copilot / Summary
       │         │
       ▼         │
 Navigation      │
 Priority        │
       │         │
       └────┬────┘
            ▼
        Navigator
            │
            ▼
          Action
```

**Rules determine priority. AI explains and summarizes.**

---

# Current Prototype Scope

The semifinal version is intentionally focused on demonstrating the core Compass workflow.

### Implemented / In Progress

* Patient role
* Caregiver role
* Navigator role
* Patient daily check-in
* Care-gap detection
* Transparent Navigation Priority scoring
* Navigator Care-Gap Dashboard
* Patient 360
* Caregiver permission model
* Care-gap resolution
* Shared application state
* Demo reset
* Persistent browser demo state
* Compass Copilot
* Responsive web interface

### Planned for a Finalist Build

If selected for the final round, the prototype architecture is designed to expand to include:

* FastAPI backend
* PostgreSQL database
* Server-side RBAC
* Authentication and secure sessions
* Audit logging
* LLM-powered summaries
* Retrieval-augmented Copilot
* `pgvector` retrieval
* PWA offline support
* Background synchronization
* FHIR-compatible integration layer
* Real-time navigator dashboard updates

---

# Technology

## Semifinal Prototype

```text
Next.js
React
TypeScript
Tailwind CSS
Zustand
Lucide React
Browser local storage
```

The semifinal application is intentionally frontend-first so the team can demonstrate the complete patient-to-navigator workflow reliably.

No real patient information is used.

---

## Target Architecture

```text
┌─────────────────────────────┐
│      Next.js / React PWA    │
│                             │
│ Patient │ Caregiver │ Nav.  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Python / FastAPI       │
│                             │
│ API │ RBAC │ Rules Engine   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│         PostgreSQL          │
│                             │
│ Patient │ Gaps │ Audit Log  │
└──────────────┬──────────────┘
               │
        ┌──────┴───────┐
        ▼              ▼
   Rules Engine     LLM + RAG
        │              │
        ▼              ▼
   Navigation       Summary /
    Priority         Copilot
```

---

# Data & Safety

## Synthetic Data

All patients and events shown in the prototype are synthetic.

**No real patient information is used.**

Manisha, Danielle, James, and the other patient records in the application are fictional demo personas.

---

## AI Safety

Compass does not use an LLM to determine Navigation Priority.

The AI layer is designed for:

* Summarization
* Information organization
* Navigator call preparation
* Record-grounded question answering

The rules engine remains separate and explainable.

Compass does not:

* Diagnose cancer
* Recommend medication
* Prescribe treatment
* Predict hospitalization
* Replace a navigator
* Replace a clinician

Humans remain responsible for care decisions.

---

## HIPAA-Aware Design

The hackathon prototype is **not represented as a HIPAA-compliant production system**.

The architecture is instead designed around principles that would matter in a production healthcare deployment, including:

* Role-based access control
* Minimum-necessary caregiver permissions
* Audit logging
* Encryption in transit and at rest
* Traceable record access
* Explicit caregiver authorization
* FHIR-compatible data mapping
* BAA-supported infrastructure for production PHI processing

Production deployment would require appropriate security review, agreements, infrastructure, and health-system integration.

---

# Project Structure

The frontend currently lives in:

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── caregiver/
│   │   ├── navigator/
│   │   │   └── patient/
│   │   ├── patient/
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── app/
│   │   ├── caregiver/
│   │   ├── navigator/
│   │   └── patient/
│   │
│   ├── lib/
│   │   ├── data.ts
│   │   ├── scoring.ts
│   │   ├── copilot.ts
│   │   └── types.ts
│   │
│   └── store/
│       └── compass-store.ts
│
├── package.json
└── ...
```

The repository structure leaves room for a future backend without restructuring the frontend:

```text
apps/
├── web/
└── api/       # finalist phase
```

---

# Getting Started

## Requirements

Use a current Node.js LTS release and npm.

Install dependencies from the repository root:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

The home screen provides role-based navigation into the Patient, Caregiver, and Navigator experiences.

---

# Demo Flow

For the intended presentation flow:

### 1. Reset the demo

Start from the seeded synthetic state.

### 2. Enter as Manisha

Submit a check-in indicating:

```text
Nausea: Severe
Transportation: Not sure
Medication: On track

Note:
"I'm worried I won't have a ride tomorrow."
```

### 3. Switch to James — Navigator

The Care-Gap Dashboard should surface Manisha as a high-priority patient.

Her score demonstrates the transparent rules:

```text
+30 Treatment within 48 hours
+25 Transportation unresolved
+20 Severe symptom
+15 Authorization pending
──────────────────────────────
 90 Navigation Priority
```

### 4. Open Patient 360

Show:

* Upcoming treatment
* Latest check-in
* Active care gaps
* Navigation Priority
* Explanation of the score

### 5. Open Compass Copilot

Ask:

```text
Prepare my call with Manisha
```

Compass should summarize the navigation issues requiring James's attention.

### 6. Resolve transportation

James resolves the transportation gap.

Compass recalculates the patient state and the Navigation Priority drops.

### 7. Return to the dashboard

Manisha's new priority is reflected in the navigator queue.

This demonstrates the complete Compass loop:

**Sense → Understand → Prioritize → Intervene**

---

# PWA Direction

Compass is being designed as a Progressive Web App so the same application can support:

* Desktop navigator workflows
* Patient smartphones
* Caregiver smartphones
* Shared clinic or community devices
* Future offline check-in support

The PWA approach avoids requiring a native app-store installation while preserving a path toward installable and offline-capable experiences.

---

# Development Checks

Before committing a feature:

```bash
npm run lint
npm run build
```

Both should pass before demo deployment.

---

# Demo State

Prototype state is currently persisted locally in the browser using Zustand persistence.

The current development storage key is:

```text
project-compass-demo-v2
```

This is strictly a prototype implementation detail.

Production patient data would not use browser local storage as the system of record.

---

# Disclaimer

**Project Compass is a hackathon prototype and is not a medical device or clinical decision-support system.**

All patient information shown in the application is synthetic.

Navigation Priority is an explainable demonstration rules engine and has not been clinically validated.

The prototype does not provide diagnosis, treatment recommendations, medication recommendations, or emergency medical guidance.

---

## Project Compass

**Help fewer patients fall through the gaps.**

*Every cancer journey is different. But no patient should have to navigate the gaps alone.*

**Patient journey → Care gap → Early visibility → Human action → Better coordinated care**
