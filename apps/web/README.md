# Project Compass — Web Application

The `apps/web` application contains the frontend prototype for **Project Compass**.

It is built with Next.js and includes the Patient, Caregiver, and Navigator experiences.

> **Current implementation:** frontend-only synthetic-data prototype with shared browser state.

---

# Technology

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Lucide React

The application uses the Next.js App Router.

---

# Current Product Flow

```text
Public Landing Page
        ↓
Login
        ↓
Authenticated Role
        │
        ├── Patient
        ├── Caregiver
        └── Navigator
```

Roles are no longer freely switchable after login.

A session determines which workspace the user enters.

---

# Demo Accounts

The login interface includes one-click demo account access for presentation speed.

### Patient

```text
Manisha Johnson
manisha@compass.demo
```

### Caregiver

```text
Danielle Johnson
danielle@compass.demo
```

### Navigator

```text
James Wilson
james@compass.demo
```

The password used internally by the frontend demo is:

```text
demo123
```

The presenter does not need to type credentials.

Clicking a demo account signs in immediately and routes to the correct workspace.

This is demo authentication only.

---

# Routes

| Route                     | Description                  |
| ------------------------- | ---------------------------- |
| `/`                       | Public Compass landing page  |
| `/login`                  | Login and demo-account entry |
| `/patient`                | Patient workspace            |
| `/caregiver`              | Caregiver workspace          |
| `/navigator`              | Navigator Care-Gap Dashboard |
| `/navigator/patient/[id]` | Patient 360                  |

---

# Patient Experience

The Patient experience currently demonstrates Manisha's synthetic cancer-care journey.

The patient can see:

- Current care stage
- Previous milestones
- Upcoming milestones
- Appointments
- Location and appointment time
- Care-plan documents
- Patient-friendly summaries
- Transportation status
- Daily check-in

The patient contributes:

- Symptom severity
- Transportation status
- Medication status
- Free-text concerns

These signals update the same patient record used by the Navigator workspace.

---

# Care Journey

The formal journey is maintained by the navigator/care team.

Journey items can represent:

```text
Diagnosis
Consultation
Treatment plan
Treatment
Appointments
Support services
Survivorship
```

Each item records:

- Title
- Description
- Date
- Status
- Who last updated it

Journey statuses include:

```text
completed
current
upcoming
```

This allows the Patient workspace to answer:

```text
What already happened?
Where am I now?
What happens next?
```

---

# Appointments

Appointments belong to the patient record.

The Navigator workspace is responsible for creating/updating formal appointments in the prototype.

Patient and permitted caregivers can view them.

Appointments include:

- Title
- Date
- Time
- Location
- Status
- Created by

Adding an appointment can also add a corresponding Care Journey milestone.

---

# Documents

The Navigator workspace can add documents associated with a patient's care journey.

The prototype stores synthetic document metadata and source text.

A document includes:

- Title
- Category
- Filename
- Source content
- Uploaded by
- Upload date
- Patient-friendly summary

The Patient workspace displays the patient-friendly explanation.

The does not upload or store real files or PHI.

---

# Caregiver Model

Caregiver relationships are explicitly connected to one patient.

The intended production flow is:

```text
Navigator creates invitation
        ↓
Patient approves caregiver
        ↓
Patient chooses permissions
        ↓
Caregiver activates access
```

Current caregiver permissions include:

```text
appointments
transportation
care_tasks
proxy_check_in
clinical_notes
navigator_notes
```

Danielle's current synthetic permission set allows:

```text
✓ Appointments
✓ Transportation
✓ Care tasks
✓ Proxy check-in

✕ Clinical notes
✕ Navigator notes
```

Caregivers cannot independently attach themselves to a patient record.

---

# Proxy Check-Ins

The domain model supports identifying who submitted each check-in.

Example:

```ts
submittedBy: {
  id: "danielle-johnson",
  name: "Danielle Johnson",
  role: "caregiver",
}
```

This makes proxy entries distinguishable from patient-entered information.

A caregiver should only be able to submit a check-in when the relationship is active and the caregiver has:

```text
proxy_check_in
```

permission.

The complete caregiver proxy-check-in UI is part of the next prototype refinement.

---

# Navigation Priority

The scoring engine lives separately from AI functionality.

Current weights:

```text
Treatment within 48 hours       +30
Transportation unresolved       +25
Severe symptom reported         +20
Authorization pending           +15
Medication difficulty           +12
```

The engine returns:

```ts
{
  (score, tier, reasons);
}
```

Priority is always derived from patient state rather than stored as a hardcoded number.

---

# Care-Gap Workflow

When a check-in is submitted, Compass can create navigation gaps.

Examples include:

```text
Transportation unresolved
Severe symptom reported
Medication concern
Authorization pending
```

Resolving a gap updates the same patient state used by:

- Patient 360
- Navigation Priority
- Navigator Dashboard
- Compass Summary
- Copilot
- Administrative Brief

This is the primary shared-state loop of the prototype.

---

# AI Prototype Layer

This version uses deterministic functions grounded in the synthetic patient record.

This avoids making the presentation dependent on an external AI API.

Current AI-facing functionality includes:

## Compass Summary

Explains what currently needs navigator attention.

## Compass Copilot

Supports prompts such as:

```text
What needs attention today?

Prepare my call with Manisha.

What changed since the last check-in?
```

## Administrative Brief

Combines open administrative tasks into one navigator-focused view.

## Patient-Friendly Document Summary

Transforms synthetic source text into a simpler patient-facing explanation.

Production versions of these features are designed to connect to an LLM/RAG layer.

---

# Important Separation

Never combine AI and Navigation Priority logic.

Maintain:

```text
scoring.ts
    ↓
Navigation Priority
```

separately from:

```text
copilot.ts
admin-ai.ts
summaries.ts
    ↓
Explanation and administrative assistance
```

AI must not calculate or determine the patient's priority score.

---

# State Management

The prototype uses Zustand.

Primary store:

```text
src/store/compass-store.ts
```

It manages:

- Current demo session
- Patients
- Caregivers
- Check-ins
- Care gaps
- Appointments
- Documents
- Journey updates
- Gap resolution
- Login/logout
- Demo reset

Current browser persistence key:

```text
project-compass-demo-v3
```

Browser local storage is strictly a prototype implementation detail.

---

# Important Source Files

```text
src/
├── app/
│   ├── login/
│   ├── patient/
│   ├── caregiver/
│   ├── navigator/
│   └── page.tsx
│
├── components/
│   ├── app/
│   ├── patient/
│   ├── caregiver/
│   └── navigator/
│
├── lib/
│   ├── admin-ai.ts
│   ├── copilot.ts
│   ├── data.ts
│   ├── scoring.ts
│   ├── summaries.ts
│   └── types.ts
│
└── store/
    └── compass-store.ts
```

---

# Header & Authentication

`AppHeader` displays the current authenticated user and role.

The header should not provide Patient/Caregiver/Navigator role switching.

Role access comes from the current session.

The header currently supports:

- Compass branding
- Current user's name
- Current role
- Synthetic-data badge
- Demo reset where appropriate
- Sign out

Sign out clears the session and returns to the public landing page.

---

# Running Locally

From the repository root:

```bash
npm install
npm run dev
```

Or from `apps/web`:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Development Validation

Before committing a major change:

```bash
npm run lint
npm run build
```

Do not rely only on `npm run dev`.

Production build validation is important before deployment.

---

# Demo Reset

Use the Reset Demo action in the Navigator interface to restore the synthetic patient dataset.

If development changes make browser state incompatible, clear:

```text
project-compass-demo-v3
```

from browser Local Storage and refresh.

---

# Prototype Demo Sequence

Recommended sequence:

```text
Landing Page
    ↓
Navigator login
    ↓
Show patient journey/admin workflow briefly
    ↓
Sign out
    ↓
Patient login
    ↓
Show journey + documents + appointment
    ↓
Submit urgent check-in
    ↓
Sign out
    ↓
Navigator login
    ↓
Dashboard shows Manisha at HIGH 90
    ↓
Patient 360
    ↓
Explain scoring
    ↓
AI Admin Brief / Copilot
    ↓
Resolve transportation
    ↓
Priority becomes 65
    ↓
Dashboard updates
```

Caregiver should be shown briefly or during Q&A unless presentation timing allows more.

---

# Current Limitations

The prototype application intentionally does not yet include:

- Production authentication
- Server-side authorization
- FastAPI
- PostgreSQL
- Real file storage
- Live LLM APIs
- FHIR integration
- Production audit logs
- Full offline synchronization
- Production PWA service worker behavior

These are planned for the finalist architecture.

---

# PWA Direction

The application is intended to become an installable Progressive Web App.

This allows one frontend codebase to support:

```text
Patient phone
Caregiver phone
Navigator desktop
Shared clinic/community device
```

Planned PWA functionality includes:

- Installable application
- Application manifest
- Service worker
- Offline application shell
- Offline patient check-in queue
- Synchronization after connectivity returns

These capabilities are especially relevant to rural and low-connectivity environments.

---

# Data Safety

All current records are synthetic.

Do not add:

- Real patient names
- Real clinical records
- Real appointments
- PHI
- Real medical documents

The prototype should always be clearly identified as synthetic where appropriate.

---

# Disclaimer

This application is a hackathon prototype.

It does not provide:

- Diagnosis
- Medication recommendations
- Treatment recommendations
- Hospitalization prediction
- Clinical prioritization

Navigation Priority is an explainable navigation workflow score and has not been clinically validated.

Humans remain responsible for care decisions and intervention.
