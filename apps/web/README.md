# Project Compass — Web

Frontend application for **Project Compass**, an AI-assisted cancer care navigation and early-intervention platform being developed for the **DevDays Cancer Care & Prevention Challenge in partnership with Ochsner Health**.

This application contains the Patient, Caregiver, and Navigator experiences used in the semifinal prototype.

> **Current phase:** Frontend-first semifinal prototype using synthetic data and browser-persisted state.

---

## What This App Demonstrates

The web application is designed around one complete care-navigation workflow:

```text
Manisha checks in
        ↓
Compass detects care gaps
        ↓
Navigation Priority becomes HIGH
        ↓
James sees Manisha at the top
        ↓
James opens Patient 360
        ↓
Compass explains the priority
        ↓
James resolves transportation
        ↓
Navigation Priority drops
        ↓
Navigator dashboard updates
```

The goal of the semifinal build is to make this workflow polished, reliable, and easy to demonstrate before introducing backend infrastructure.

---

## Current Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Lucide React
- Browser local storage

The project uses the Next.js App Router.

---

## Application Roles

The prototype contains three role-specific experiences.

### Patient

The Patient experience currently focuses on **Manisha**, a synthetic cancer patient.

Routes:

```text
/patient
```

Current functionality includes:

- Daily check-in
- Symptom reporting
- Transportation status
- Medication status
- Free-text concerns
- Care journey information

Patient check-ins feed directly into the Compass care-gap rules engine.

---

### Caregiver

The Caregiver experience currently focuses on **Danielle**, Manisha's daughter.

Routes:

```text
/caregiver
```

Current functionality includes:

- View permitted appointment information
- View transportation status
- Coordinate transportation
- View permission-scoped access
- Resolve permitted logistics barriers

The caregiver relationship is intentionally permission-based.

The intended workflow is:

```text
Navigator creates invitation
        ↓
Patient approves caregiver
        ↓
Patient selects permissions
        ↓
Caregiver activates access
```

A caregiver cannot independently attach themselves to a patient's record.

Future caregiver functionality includes proxy check-ins when the patient explicitly grants the:

```text
proxy_check_in
```

permission.

---

### Navigator

The Navigator experience represents **James**, a cancer care navigator.

Routes:

```text
/navigator

/navigator/patient/[id]
```

Current functionality includes:

- Care-Gap Dashboard
- Navigation Priority ranking
- Patient 360
- Active care-gap review
- Check-in history
- Priority explanation
- Care-gap resolution
- Compass Copilot

The Navigator Dashboard is the primary desktop experience.

---

# Navigation Priority

Navigation Priority is intentionally implemented using transparent rules rather than an opaque AI model.

The current demonstration weights are:

| Signal                    | Points |
| ------------------------- | -----: |
| Treatment within 48 hours |    +30 |
| Transportation unresolved |    +25 |
| Severe symptom reported   |    +20 |
| Authorization pending     |    +15 |
| Medication difficulty     |    +12 |

For example:

```text
Treatment tomorrow             +30
Transportation unresolved      +25
Severe nausea                  +20
Authorization pending          +15
                               ───
Navigation Priority             90
```

The score is called **Navigation Priority**, not clinical risk.

The rules engine determines priority.

The AI/Copilot layer does not determine the score.

---

## Compass Copilot

Compass Copilot is the navigator-facing explanation layer.

It is designed to answer questions such as:

```text
What needs attention today?

Prepare my call with Manisha

What changed since the last check-in?
```

For the semifinal prototype, responses are grounded directly in the synthetic Compass patient record and may be generated deterministically.

This keeps the live demonstration reliable while preserving the intended architecture:

```text
Patient Record
      │
      ├──────────────┐
      ▼              ▼
Rules Engine      Copilot
      │              │
      ▼              │
Navigation           │
Priority             │
      │              │
      └──────┬───────┘
             ▼
         Navigator
             │
             ▼
           Action
```

A finalist implementation can replace the Copilot generation layer with an LLM/RAG service without changing the priority engine.

---

# Project Structure

The application follows the Next.js `src` structure:

```text
apps/web/
├── public/
│
├── src/
│   ├── app/
│   │   ├── caregiver/
│   │   │   └── page.tsx
│   │   │
│   │   ├── navigator/
│   │   │   ├── page.tsx
│   │   │   └── patient/
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   │
│   │   ├── patient/
│   │   │   └── page.tsx
│   │   │
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── app/
│   │   ├── caregiver/
│   │   ├── navigator/
│   │   └── patient/
│   │
│   ├── lib/
│   │   ├── copilot.ts
│   │   ├── data.ts
│   │   ├── scoring.ts
│   │   └── types.ts
│   │
│   └── store/
│       └── compass-store.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

---

# Key Files

## `src/lib/types.ts`

Contains the shared domain types used throughout the prototype:

- Patient
- CheckIn
- CareGap
- Caregiver
- CaregiverPermission
- Treatment information

Keep domain definitions here rather than defining duplicate types inside components.

---

## `src/lib/data.ts`

Contains synthetic seed data for the demonstration.

This includes:

- Manisha
- Danielle
- Other synthetic dashboard patients
- Care gaps
- Initial check-ins
- Caregiver relationships

No real patient data should ever be added to this file.

---

## `src/lib/scoring.ts`

Contains the explainable Navigation Priority rules engine.

This file should remain separate from:

```text
copilot.ts
```

because priority calculation and AI explanation serve different purposes.

---

## `src/lib/copilot.ts`

Contains the prototype Compass Copilot response-generation logic.

The semifinal implementation is intentionally deterministic and grounded in the current patient record.

A future LLM integration should preserve the same interface where practical so UI components do not need to understand which model/provider is being used.

---

## `src/store/compass-store.ts`

Contains the shared prototype application state using Zustand.

Responsibilities currently include:

- Patient state
- Caregiver state
- Check-in submission
- Care-gap creation
- Care-gap resolution
- Demo reset
- Browser persistence

This is a **prototype state layer**, not the intended production persistence architecture.

---

# State Persistence

The semifinal prototype persists application state in the browser so the story can move between roles without losing changes.

Current storage key:

```text
project-compass-demo-v2
```

This allows a workflow such as:

```text
Patient check-in
      ↓
Navigate to Navigator
      ↓
Updated patient remains available
      ↓
Resolve care gap
      ↓
Return to Dashboard
      ↓
Updated priority remains visible
```

Browser local storage is not intended to be the production patient-data store.

The finalist architecture will move persistent records behind the API/database layer.

---

# Getting Started

From the repository root:

```bash
npm install
```

Start the web application:

```bash
npm run dev
```

Or from this directory:

```bash
cd apps/web
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Important Routes

| Route                     | Purpose                         |
| ------------------------- | ------------------------------- |
| `/`                       | Demo home / role selection      |
| `/patient`                | Manisha's patient experience    |
| `/caregiver`              | Danielle's caregiver experience |
| `/navigator`              | James's Care-Gap Dashboard      |
| `/navigator/patient/[id]` | Navigator Patient 360           |

Do not require presenters to manually type routes during the demo.

All important demo routes should be reachable through the application UI.

---

# Demo Scenario

Before presentation rehearsal, reset the demo.

Then enter as Manisha.

Submit:

```text
Nausea
Severe

Transportation
Not sure

Medication
On track

Note
"I'm worried I won't have a ride tomorrow."
```

Compass should detect:

```text
Treatment within 48 hours      +30
Transportation unresolved      +25
Severe nausea                  +20
Authorization pending          +15
                               ───
Navigation Priority             90
```

Switch to Navigator.

Manisha should appear near or at the top of the Care-Gap Dashboard with:

```text
HIGH · 90
```

Open Patient 360.

Show:

- Upcoming treatment
- Latest check-in
- Active care gaps
- Priority explanation
- Compass Copilot

Ask Copilot:

```text
Prepare my call with Manisha
```

Then resolve the transportation barrier.

The transportation gap should close and the Navigation Priority should decrease.

Return to the dashboard and show the updated ranking.

---

# Development Rules

## Keep the Demo Reliable

The semifinal application should prioritize reliability over architectural complexity.

Do not introduce external services into the critical demo path unless they materially improve the presentation.

In particular, the prototype does not require:

- PostgreSQL
- FastAPI
- Real authentication
- Live LLM API calls
- FHIR integration
- WebSockets

Those belong to the finalist implementation.

---

## Keep Priority Explainable

Never move Navigation Priority calculation into the Copilot or an LLM.

Maintain:

```text
Rules → Priority

Patient record → Copilot explanation
```

not:

```text
LLM → Priority
```

---

## Keep Data Synthetic

All patient information used by this application must be synthetic.

Do not add:

- Real names
- Real medical records
- Real appointment information
- Real PHI
- Real patient identifiers

The UI should continue to identify the application as a synthetic-data prototype where appropriate.

---

# Quality Checks

Before committing a completed feature:

```bash
npm run lint
npm run build
```

Both commands should pass.

The production build is especially important because development mode can tolerate problems that fail during deployment.

---

# Resetting Local Demo State

Use the application's **Reset Demo** functionality whenever possible.

During development, if persisted state becomes incompatible after a schema change, the local browser state can also be cleared.

Current key:

```text
project-compass-demo-v2
```

In Chrome:

```text
Developer Tools
→ Application
→ Local Storage
→ http://localhost:3000
→ project-compass-demo-v2
```

Delete the key and refresh.

Do not build production-style database migrations for temporary browser prototype state.

---

# PWA Direction

The web application is intended to become an installable Progressive Web App.

The PWA direction supports:

- Mobile patient experience
- Mobile caregiver experience
- Desktop navigator experience
- Installable application behavior
- Future offline check-ins
- Future queued synchronization
- Shared/community-device scenarios

Offline functionality should be introduced carefully so it does not compromise the reliability of the semifinal demonstration.

---

# Finalist Architecture

If Project Compass advances, the frontend is designed to connect to:

```text
Next.js PWA
      │
      ▼
FastAPI
      │
      ├───────────────┐
      ▼               ▼
PostgreSQL       Rules Engine
      │
      ▼
Patient Records
      │
      ├───────────────┐
      ▼               ▼
Audit Log        LLM / RAG
                      │
                      ▼
               Compass Copilot
```

The browser store used in the semifinal prototype will then become frontend state/cache rather than the source of truth.

---

# Safety

Project Compass is a hackathon prototype.

It does not:

- Diagnose cancer
- Recommend treatment
- Recommend medication
- Predict hospitalization
- Replace clinicians
- Replace cancer navigators

Navigation Priority is an explainable prototype rules engine and has not been clinically validated.

Compass is designed to put the **right navigation problem in front of the right human at the right time**.

---

**Project Compass — Web Prototype**

_Synthetic data only. No real patient information is used._
