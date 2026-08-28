<div align="center">

# RecoverAI

**AI-powered payment recovery infrastructure for intelligent, safe, and explainable revenue recovery.**

RecoverAI analyzes failed payments, determines the safest recovery strategy, executes authorized recovery actions asynchronously, and provides a complete audit trail from failure to financial recovery.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](#)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)](#)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](#)
[![License](https://img.shields.io/badge/License-Demonstration-lightgrey?style=flat)](#license)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Product](#product)
- [Dashboard](#dashboard)
- [Recovery Decision Engine](#recovery-decision-engine)
- [Recovery Actions](#recovery-actions)
- [Safety Architecture](#safety-architecture)
- [Asynchronous Architecture](#asynchronous-architecture)
- [Payment Recovery with Razorpay](#payment-recovery-with-razorpay)
- [Payment Reconciliation](#payment-reconciliation)
- [Idempotency](#idempotency)
- [Auditability](#auditability)
- [State Machine](#state-machine)
- [Data Model](#data-model)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Local Development](#local-development)
- [Recovery Scenario Tests](#recovery-scenario-tests)
- [End-to-End Demo](#end-to-end-demo)
- [Engineering Highlights](#engineering-highlights)
- [Production Readiness](#production-readiness)
- [Future Production Extensions](#future-production-extensions)
- [Security Considerations](#security-considerations)
- [Design Philosophy](#design-philosophy)
- [Screenshots](#screenshots)
- [Project Status](#project-status)
- [Author](#author)
- [License](#license)

---

## Overview

Payment failures are not all the same.

- A **timeout** may be worth retrying.
- An **insufficient-funds** failure may require customer action.
- A **suspicious transaction** should never be automatically retried.

RecoverAI is built around this principle:

> **AI recommends. Policy authorizes. Workers execute.**

Instead of blindly retrying every failed payment, RecoverAI combines an AI recovery agent with deterministic safety policies and asynchronous payment workers. The result is a recovery system capable of handling three distinct paths:

```text
                    Failed Payment
                          │
                          ▼
                  AI Recovery Agent
                          │
                          ▼
                 Deterministic Policy
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
          RETRY       OUTREACH      MANUAL REVIEW
             │            │            │
             ▼            ▼            │
       Retry Worker  Outreach Worker   │
             │            │            │
             └──────┬─────┘            │
                    ▼                  │
              Recovery Payment         │
                    │                  │
                    ▼                  │
              Payment Webhook          │
                    │                  │
                    ▼                  │
               Reconciliation          │
                    │                  │
                    ▼                  ▼
                 RECOVERED         Human Review
```

---

## Product

RecoverAI provides an **operations dashboard** for monitoring payment recovery across the entire lifecycle. The dashboard allows operators to understand:

- How much revenue is at risk
- How much revenue has been recovered
- Which recovery strategies are being used
- Why a recovery decision was made
- Which attempts have executed
- Which payments require human intervention
- What happened at every stage of the recovery lifecycle

---

## Dashboard

### Overview

The Overview page provides a high-level operational view of the recovery system. It surfaces:

| Metric | Description |
|---|---|
| Total recovery cases | All cases currently tracked by the system |
| Recovered cases | Cases that reached a `RECOVERED` state |
| Open cases | Cases awaiting a decision or action |
| Retrying cases | Cases currently in the retry path |
| Customer outreach cases | Cases awaiting customer action |
| Manual review cases | Cases blocked from automation |
| Exhausted cases | Cases that ran out of eligible attempts |
| Total revenue at risk | Sum of unrecovered failed payments |
| Total revenue recovered | Sum of successfully recovered payments |
| Outstanding revenue | Revenue still unresolved |
| Recovery rate | % of cases recovered |
| Revenue recovery rate | % of at-risk revenue recovered |
| Attempt success rate | % of recovery attempts that succeeded |

> **Screenshot:** `docs/screenshots/overview.png`

The Overview page is designed to answer one question immediately: **"How is RecoverAI performing right now?"**

### Recovery Cases

The Recovery Cases page provides an operational queue of payment recovery cases. Each case exposes:

- Recovery case ID
- Payment status
- Failure reason
- Amount at risk
- Amount recovered
- Recommended recovery action
- Retry attempts
- Outreach attempts
- Current recovery state

Operators can use this page to identify cases requiring attention and drill into individual recovery journeys.

> **Screenshot:** `docs/screenshots/recovery-cases.png`

### Case Details

The Case Details page is the core observability surface of RecoverAI. It combines payment information, AI reasoning, policy decisions, recovery actions, attempts, and audit events into one recovery timeline.

```text
Payment Failed
      ↓
AI Diagnosis
      ↓
Policy Decision
      ↓
Recovery Action
      ↓
Execution
      ↓
Payment Outcome
```

The page provides visibility into:

**Payment**
- Original payment
- Payment provider ID
- Amount / Currency
- Failure reason
- Payment status

**AI Diagnosis**
- Failure classification
- Recoverability
- AI confidence
- Reasoning

**Recovery Policy**
- Recommended action
- Whether the action was authorized
- Policy constraints

**Recovery Attempts**
- Attempt number
- Action
- Status
- Idempotency key
- External provider ID

**Audit Trail**
- AI decisions
- Policy decisions
- Worker execution
- Payment creation
- Reconciliation
- State transitions

> **Screenshot:** `docs/screenshots/case-details.png`

### Revenue

The Revenue page focuses on the financial outcome of recovery operations:

```text
Amount at Risk
      ↓
Recovery Attempts
      ↓
Amount Recovered
      ↓
Outstanding Revenue
```

This allows operators to understand the financial impact of the recovery engine rather than only looking at technical execution metrics.

> **Screenshot:** `docs/screenshots/revenue.png`

### Batch Recovery

The Batch Recovery page provides an aggregate view of multiple recovery cases, including:

- Total cases / Recovered cases
- Amount at risk / Amount recovered / Outstanding amount
- Recovery rate / Revenue recovery rate
- Total recovery attempts / Successful attempts

> **Screenshot:** `docs/screenshots/batch-recovery.png`

### Policy

The Policy page exposes the deterministic safety layer that sits between AI recommendations and payment execution — a critical architectural boundary.

```text
AI Recommendation
        ↓
Policy Evaluation
        ↓
Authorized Action
        ↓
Execution Worker
```

The policy engine can enforce rules such as:

- Maximum retry attempts
- Minimum confidence for automated retry
- High-value payment restrictions
- Fraud-risk blocking
- Fail-closed behavior

```text
FRAUD_RISK
     ↓
STOP_AND_REVIEW
     ↓
No automated payment execution
```

> **Screenshot:** `docs/screenshots/policy.png`

---

## Recovery Decision Engine

RecoverAI uses an AI recovery agent to analyze failed payments. The agent receives structured payment context:

```json
{
  "amount": 290000,
  "currency": "INR",
  "failureReason": "Insufficient funds",
  "previousAttempts": 0
}
```

The model returns a structured recovery decision:

```json
{
  "classification": "INSUFFICIENT_FUNDS",
  "recoverability": "HIGH",
  "recommendedAction": "CUSTOMER_OUTREACH",
  "confidence": 0.91,
  "reason": "Customer action is required before another payment attempt.",
  "maxRetries": 0
}
```

### Supported Failure Classifications

| Classification | Meaning |
|---|---|
| `INSUFFICIENT_FUNDS` | Customer may need to resolve funding issues |
| `NETWORK_ERROR` | Temporary provider/network failure |
| `TIMEOUT` | Temporary payment processing timeout |
| `BANK_DECLINE` | Payment rejected by the bank |
| `FRAUD_RISK` | Suspicious or potentially fraudulent payment |
| `UNKNOWN` | Failure cannot be confidently classified |

---

## Recovery Actions

The recovery engine can produce three actions.

### 1. `RETRY_PAYMENT`

Used for temporary failures where another attempt may succeed.

```text
TIMEOUT
   ↓
AI Recommendation
   ↓
Policy Authorization
   ↓
Retry Worker
   ↓
Recovery Order
   ↓
Checkout
```

### 2. `CUSTOMER_OUTREACH`

Used when the customer needs to take action.

```text
INSUFFICIENT_FUNDS
       ↓
CUSTOMER_OUTREACH
       ↓
Outreach Worker
       ↓
Payment Request
       ↓
Recovery Checkout
       ↓
Payment Captured
       ↓
RECOVERED
```

> The current implementation uses a simulated outreach channel while preserving the production-oriented recovery architecture.

### 3. `STOP_AND_REVIEW`

Used when automated recovery is unsafe or policy does not authorize the AI recommendation.

```text
FRAUD_RISK
     ↓
Policy Evaluation
     ↓
Automation Blocked
     ↓
MANUAL_REVIEW
```

No automated payment recovery is executed.

---

## Safety Architecture

A central design decision in RecoverAI is that **the AI model never directly executes financial actions**. The responsibilities are separated:

```text
┌──────────────────────────────────────┐
│               AI Agent               │
│                                      │
│  Understand failure + recommend path │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│            Policy Engine             │
│                                      │
│  Deterministic authorization rules   │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│          Execution Workers           │
│                                      │
│  Retry / Outreach / Recovery Actions │
└──────────────────────────────────────┘
```

This prevents an LLM response from directly controlling a financial operation.

### Policy Controls

RecoverAI implements deterministic safeguards including:

- **Retry limits** — automated retries are limited to a maximum number of business attempts
- **Confidence threshold** — automated retry decisions require sufficient AI confidence
- **High-value protection** — high-value payments can be blocked from automatic retry and routed for review
- **Fraud protection** — fraud-risk classifications are never automatically recovered
- **Fail closed** — when the system cannot safely authorize a recovery action, `STOP_AND_REVIEW` is selected

---

## Asynchronous Architecture

Recovery operations are processed asynchronously using **BullMQ** and **Redis**.

```text
                    Recovery Event
                          │
                          ▼
                 Recovery Decision Queue
                          │
                          ▼
                 Recovery Decision Worker
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
        Retry Queue               Outreach Queue
             │                         │
             ▼                         ▼
        Retry Worker             Outreach Worker
             │                         │
             └────────────┬────────────┘
                          ▼
                   Payment Provider
```

This separates decision processing, payment execution, customer outreach, and webhook reconciliation — allowing each worker type to scale independently.

---

## Payment Recovery with Razorpay

RecoverAI integrates with **Razorpay Test Mode** for recovery payment creation and checkout. A recovery action can create a dedicated recovery order:

```text
Original Payment
      │
      └── FAILED
             │
             ▼
        Recovery Case
             │
             ▼
      Recovery Decision
             │
             ▼
       Recovery Order
             │
             ▼
          Checkout
             │
             ▼
      Payment Captured
```

The original failed payment and the recovery payment are intentionally treated as separate financial events.

---

## Payment Reconciliation

When a recovery payment is captured, the Razorpay webhook triggers reconciliation. The reconciliation process:

1. Receives the payment webhook
2. Verifies the webhook
3. Identifies the payment
4. Finds the associated recovery attempt
5. Marks the captured payment as `CAPTURED`
6. Marks the `RecoveryCase` as `RECOVERED`
7. Records `amountRecovered`
8. Creates reconciliation audit events
9. Prevents duplicate processing

The original failed payment remains `FAILED`, while the recovery payment becomes `CAPTURED`. The business recovery is represented by:

```text
RecoveryCase.status = RECOVERED
```

This preserves the actual payment history while accurately representing recovered revenue.

---

## Idempotency

Financial operations must be resilient to duplicate requests and events. RecoverAI implements business-level idempotency:

| Operation | Key Pattern |
|---|---|
| Retry attempts | `retry:<caseId>:<attemptNumber>` |
| Outreach attempts | `outreach:<caseId>:<attemptNumber>` |
| Queue jobs | Deterministic job identifiers where appropriate |
| Webhooks | Provider event IDs persisted to prevent duplicate processing |

```text
Duplicate Event
      ↓
Existing Business Operation
      ↓
Do Not Execute Again
```

---

## Auditability

Every important recovery stage is persisted as an audit event.

```text
AI_DECISION
     ↓
POLICY_DECISION
     ↓
CUSTOMER_OUTREACH
     ↓
RECOVERY_PAYMENT_CREATED
     ↓
PAYMENT_RECONCILIATION
     ↓
PAYMENT_CAPTURED
     ↓
STATE_TRANSITION
```

Each audit event can contain: **actor, stage, input, output, timestamp, recovery case**.

This provides an explainable recovery trail for operators and future compliance requirements.

---

## State Machine

Recovery cases move through explicit business states.

```text
             ┌─────────┐
             │  OPEN   │
             └────┬────┘
                  │
        ┌─────────┼──────────┐
        │         │          │
        ▼         ▼          ▼
   RETRYING   OUTREACH   MANUAL_REVIEW
        │         │
        ▼         ▼
   RECOVERED  RECOVERED
        │
        ▼
   EXHAUSTED
```

Terminal states include: `RECOVERED`, `EXHAUSTED`, `MANUAL_REVIEW`, `ABANDONED`. Terminal cases are not automatically processed again.

---

## Data Model

```text
Payment
   │
   └── RecoveryCase
          │
          ├── RecoveryAttempt[]
          │
          ├── OutreachAttempt[]
          │
          └── AuditEvent[]
```

- **Payment** — represents the original payment transaction
- **RecoveryCase** — represents the business-level recovery lifecycle
  - `amountAtRisk`, `amountRecovered`, `status`, `failureReason`, `recommendedAction`, `retryAttempts`, `outreachAttempts`
- **RecoveryAttempt** — represents an individual recovery action
- **AuditEvent** — represents an immutable record of a recovery lifecycle event

---

## Technology Stack

**Backend**
`TypeScript` · `Node.js` · `Fastify` · `Prisma` · `PostgreSQL` · `Redis` · `BullMQ` · `Razorpay` · `Groq` · `Zod`

**Frontend**
`React` · `TypeScript` · `Vite` · `Tailwind CSS`

**Infrastructure**
`Docker` · `Docker Compose` · `PostgreSQL` · `Redis`

---

## Repository Structure

```text
recoverai/
│
├── apps/
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── agents/
│   │   │   │   ├── tools/
│   │   │   │   └── recovery-agent.ts
│   │   │   │
│   │   │   ├── ai/
│   │   │   │   └── recovery-agent.ts
│   │   │   │
│   │   │   ├── policies/
│   │   │   │   └── policy-engine.ts
│   │   │   │
│   │   │   ├── routes/
│   │   │   │   └── recovery.routes.ts
│   │   │   │
│   │   │   ├── services/
│   │   │   │   ├── audit.service.ts
│   │   │   │   ├── customer-outreach.service.ts
│   │   │   │   ├── payment-reconciliation.service.ts
│   │   │   │   └── recovery-metrics.service.ts
│   │   │   │
│   │   │   ├── workers/
│   │   │   │   ├── recovery-decision-worker.ts
│   │   │   │   └── outreach-execution-worker.ts
│   │   │   │
│   │   │   └── queue/
│   │   │
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   │
│   │   └── scripts/
│   │       ├── test-retry-recovery.ts
│   │       ├── test-customer-outreach.ts
│   │       └── test-manual-review.ts
│   │
│   └── web/
│       └── src/
│           ├── api/
│           ├── components/
│           └── pages/
│
├── docs/
│   └── screenshots/
│       ├── overview.png
│       ├── recovery-cases.png
│       ├── case-details.png
│       ├── revenue.png
│       ├── batch-recovery.png
│       └── policy.png
│
├── docker-compose.yml
└── README.md
```

---

## Local Development

### Requirements

Install:

- Node.js
- npm
- Docker
- Docker Compose

You will also need:

- Groq API credentials
- Razorpay Test Mode credentials

### Environment Variables

**API** (`apps/api/.env`)

```bash
DATABASE_URL="postgresql://recoverai:recoverai@localhost:5432/recoverai"
REDIS_URL="redis://localhost:6379"
GROQ_API_KEY="your_groq_api_key"
RAZORPAY_KEY_ID="your_razorpay_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
```

**Frontend** (`apps/web/.env`)

```bash
VITE_API_URL="http://localhost:3000"
VITE_RAZORPAY_KEY_ID="your_razorpay_key_id"
```

> ⚠️ Never expose `RAZORPAY_KEY_SECRET` to the frontend.

### Start Infrastructure

```bash
docker compose up -d
```

Verify the services:

```bash
docker compose ps
```

### Database Setup

Generate Prisma Client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

### Run the API

```bash
cd apps/api
npm run dev
```

### Run the Frontend

```bash
cd apps/web
npm run dev
```

---

## Recovery Scenario Tests

RecoverAI includes dedicated scripts for demonstrating the three major recovery paths.

### Retry Recovery

```bash
cd apps/api
npx tsx scripts/test-retry-recovery.ts
```

```text
FAILED
  ↓
TIMEOUT / NETWORK ERROR
  ↓
AI → RETRY_PAYMENT
  ↓
Policy → ALLOWED
  ↓
Retry Worker
  ↓
Recovery Order
```

### Customer Outreach

```bash
cd apps/api
npx tsx scripts/test-customer-outreach.ts
```

```text
FAILED
  ↓
INSUFFICIENT_FUNDS
  ↓
AI → CUSTOMER_OUTREACH
  ↓
Policy → ALLOWED
  ↓
Outreach Worker
  ↓
Recovery Checkout
  ↓
Payment Captured
  ↓
RECOVERED
```

### Manual Review

```bash
cd apps/api
npx tsx scripts/test-manual-review.ts
```

```text
FAILED
  ↓
FRAUD_RISK
  ↓
AI → STOP_AND_REVIEW
  ↓
Policy → BLOCKED
  ↓
MANUAL_REVIEW
```

No automated recovery payment is created.

---

## End-to-End Demo

The recommended demonstration flow:

**Scenario 1 — Automated Retry**
Start with a temporary failure and show:
`Failed Payment → AI Diagnosis → Retry Recommendation → Policy Authorization → Retry Worker → Recovery Order → Checkout`

**Scenario 2 — Customer Outreach**
Start with an insufficient-funds failure and show:
`AI Diagnosis → Customer Outreach → Payment Request → Recovery Checkout → Razorpay Test Payment → Webhook → Reconciliation → RECOVERED`

**Scenario 3 — Manual Review**
Use a suspicious payment scenario and show:
`AI Diagnosis → Fraud Risk → Policy Block → Manual Review`

Emphasize that the system intentionally does nothing automatically in this case.

---

## Engineering Highlights

- **AI + Deterministic Policy** — the system does not rely on the LLM alone (`LLM → Recommendation → Deterministic Policy → Authorization`)
- **Asynchronous Execution** — BullMQ separates decision processing from payment execution
- **Financial Idempotency** — business-level idempotency prevents duplicate recovery actions
- **Webhook Reconciliation** — payment capture is reconciled from provider events instead of trusting frontend state
- **Auditability** — recovery decisions and financial events are persisted for complete traceability
- **Fail-Closed Safety** — when an automated action cannot be safely authorized, `MANUAL_REVIEW` wins

---

## Production Readiness

RecoverAI is architected around production-oriented principles:

- Separation of AI and financial execution
- Deterministic policy enforcement
- Asynchronous workers
- Database-backed state transitions
- Idempotent recovery attempts
- Webhook-based reconciliation
- Persistent audit trail
- Retry limits
- Fraud-risk blocking
- Fail-closed behavior
- Operational metrics
- Explicit recovery state machine

> The current implementation uses Razorpay Test Mode and a simulated customer outreach channel for demonstration. The architecture is designed so these integrations can be replaced with production payment and communication providers without changing the core recovery decision model.

---

## Future Production Extensions

- Real email delivery
- SMS/WhatsApp providers
- Customer notification templates
- Adaptive retry scheduling
- Multiple payment providers
- Customer-level recovery policies
- Role-based access control
- Operator approval workflows
- Advanced fraud signals
- Recovery prediction models
- Distributed worker scaling
- Observability and alerting
- Production secrets management

---

## Security Considerations

| Area | Principle |
|---|---|
| Secrets | Provider secrets remain server-side |
| Webhooks | Incoming payment events are verified before reconciliation |
| AI Isolation | AI output is treated as untrusted input and validated using structured schemas |
| Policy Isolation | AI recommendations must pass deterministic policy checks |
| Financial Execution | Payment execution occurs only through controlled server-side tools |
| Auditability | Critical decisions and state changes are persisted |

---

## Design Philosophy

RecoverAI is built around a simple principle:

> **Automation should increase recovery without increasing financial risk.**

That means the system does not ask *"Can we retry this payment?"* — it asks:

> **"What is the safest action that gives us a reasonable chance of recovering this revenue?"**

Sometimes that answer is `RETRY`. Sometimes it's `CUSTOMER_OUTREACH`. And sometimes the correct answer is `STOP_AND_REVIEW`.

Knowing when *not* to automate is just as important as knowing when to automate.

---

## Screenshots

Suggested viewing order — this sequence tells the whole story visually: **what the product is → how it reasons → how it recovers → how it stays safe.**

| Order | Page | Path |
|---|---|---|
| 1 | Operations Overview | `docs/screenshots/overview.png` |
| 2 | Recovery Case Details | `docs/screenshots/case-details.png` |
| 3 | Retry Recovery | `docs/screenshots/recovery-cases.png` |
| 4 | Customer Outreach | `docs/screenshots/revenue.png` |
| 5 | Manual Review | `docs/screenshots/batch-recovery.png` |
| 6 | Policy | `docs/screenshots/policy.png` |

<!--
<p align="center">
  <img src="docs/screenshots/overview.png" width="800" alt="Operations Overview" />
</p>
<p align="center">
  <img src="docs/screenshots/case-details.png" width="800" alt="Recovery Case Details" />
</p>
<p align="center">
  <img src="docs/screenshots/recovery-cases.png" width="800" alt="Recovery Cases" />
</p>
<p align="center">
  <img src="docs/screenshots/revenue.png" width="800" alt="Revenue" />
</p>
<p align="center">
  <img src="docs/screenshots/batch-recovery.png" width="800" alt="Batch Recovery" />
</p>
<p align="center">
  <img src="docs/screenshots/policy.png" width="800" alt="Policy" />
</p>
-->

---

## Project Status

### Core Recovery Engine

- [x] Failed payment ingestion
- [x] AI failure classification
- [x] AI recovery recommendation
- [x] Structured AI output validation
- [x] Deterministic policy engine
- [x] Retry recovery
- [x] Customer outreach
- [x] Manual review
- [x] Recovery state machine
- [x] BullMQ workers
- [x] Redis queue
- [x] Razorpay recovery orders
- [x] Razorpay checkout
- [x] Payment webhook handling
- [x] Payment reconciliation
- [x] Idempotent recovery attempts
- [x] Audit trail
- [x] Recovery metrics
- [x] Operations dashboard
- [x] Recovery scenario test scripts

### Production Extensions

- [ ] Production notification provider
- [ ] Authentication / RBAC
- [ ] Production payment credentials
- [ ] Advanced observability
- [ ] Multi-provider payment support
- [ ] Adaptive recovery optimization

---

## Author

**Jeganath B**

*jeganathb2004@gmail.com*
 


Built as an end-to-end engineering project focused on:

- AI-assisted decision systems
- Payment infrastructure
- Distributed workers
- Deterministic policy enforcement
- Financial reconciliation
- Auditability
- Full-stack product engineering

---

## License

This project is provided for demonstration and engineering evaluation purposes.