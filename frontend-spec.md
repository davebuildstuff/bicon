# Bicon Frontend Developer Specification

> **This document is derived directly from the backend source code — every endpoint, field name,
> response shape, and WebSocket event is verified from the actual implementation.
> Do not deviate from what is written here.**

---

## Quick Reference

| Item | Value |
|------|-------|
| REST base URL | `http://localhost:3000/api` |
| Health check | `http://localhost:3000/health` (no `/api` prefix) |
| WebSocket | `http://localhost:3000` (Socket.io, **not** raw WebSocket) |
| Swagger UI | `http://localhost:3000/docs` |
| Auth | `Authorization: Bearer <token>` on every protected request |
| Content-Type | `application/json` for all POST/PATCH requests |

---

## Screens

| Screen | Purpose |
|--------|---------|
| **Login** | Enter admin secret → get JWT |
| **Dashboard** | Live incident feed, KPI cards, real-time WebSocket updates |
| **Incident Detail** | Full incident card — VES score, API call log, Claude triage, action buttons |
| **Zones** | Create/list/edit/delete Nokia geofence zones |
| **Wardens** | Register wardens, watch KYC complete in real-time |
| **Simulate** | Trigger demo scenarios — buttons for each scenario + v1/v2 toggle |

---

## Standard Response Envelope

Every REST response from `/api/*` uses this shape:

```jsonc
// Success
{
  "status": "success",
  "statusCode": 201,
  "data": { /* payload */ }
}

// Error
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [ /* optional validation detail array */ ]
}
```

**Exception:** `POST /api/simulate/:scenario` returns a raw object — no envelope. See Section 8.

---

## 1. Authentication

### POST `/api/auth/token` — get JWT
No `Authorization` header needed.

**Request body:**
```json
{ "adminSecret": "Y2lyY3VzcnVzaGJ1ZmZhbA==" }
```

**Rules:**
- `adminSecret` is required, string, min 1 char
- Extra fields in the body → 400 (whitelist validation is strict on every endpoint)

**Response 201:**
```json
{
  "status": "success",
  "statusCode": 201,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "24h"
  }
}
```

**Response 401:**
```json
{ "status": "error", "statusCode": 401, "message": "Invalid admin secret" }
```

**Frontend flow:**
1. On login screen, POST to this endpoint
2. Store `data.access_token` in memory (not localStorage)
3. Attach as `Authorization: Bearer <token>` on every subsequent request
4. Token expires in 24h — any 401 from a protected route → redirect to login

---

## 2. Health Check

### GET `/health` — infrastructure status
No `/api` prefix. No auth required.

**Response 200:**
```json
{ "status": "ok", "mongo": "connected", "redis": "connected" }
```

**Response 503:**
```json
{ "status": "error", "mongo": "disconnected", "redis": "connected" }
```

Show a status indicator on the dashboard. If 503, display a system-down banner.

---

## 3. Incidents

### GET `/api/incidents` — list incidents (paginated)
**Auth required.**

**Query parameters (all optional):**

| Param | Type | Description |
|-------|------|-------------|
| `page` | integer ≥ 1 | default: 1 |
| `limit` | integer 1–100 | default: 20 |
| `status` | IncidentStatus enum | filter by status |
| `tier` | VesTier enum | filter by VES tier |
| `zoneId` | string | MongoDB ObjectId |
| `from` | ISO 8601 string | e.g. `2025-01-01T00:00:00.000Z` |
| `to` | ISO 8601 string | |

**Response 200:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "data": [ /* Incident[] */ ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

---

### GET `/api/incidents/:id` — get incident detail
**Auth required.**

**Response 200:** `{ "status": "success", "statusCode": 200, "data": Incident }`  
**Response 404:** `{ "status": "error", "statusCode": 404, "message": "Incident <id> not found" }`

---

### POST `/api/incidents/:id/dispatch`
**Auth required. No request body.**

Moves incident from WATCH/HIGH/CRITICAL → DISPATCHED. Also emits `incident:status-changed` WebSocket event.

**Response 200:** `{ "status": "success", "statusCode": 200, "data": Incident }`  
**Response 409:** invalid status transition  
**Response 404:** not found

---

### POST `/api/incidents/:id/dismiss`
**Auth required. No request body.**

Moves incident from PENDING/SCORING/WATCH/HIGH/CRITICAL → DISMISSED.

**Response 200:** `{ "status": "success", "statusCode": 200, "data": Incident }`  
**Response 409:** invalid status transition

---

### POST `/api/incidents/:id/resolve`
**Auth required. No request body.**

Moves incident from DISPATCHED only → RESOLVED.

**Response 200:** `{ "status": "success", "statusCode": 200, "data": Incident }`  
**Response 409:** `"Incident can only be resolved from DISPATCHED status. Current: <status>"`

---

### Incident Object (full shape)

```typescript
interface Incident {
  _id: string;                   // MongoDB ObjectId string — use as primary key
  status: IncidentStatus;
  source: SignalSource;
  type: IncidentType;
  phoneNumber?: string;          // e.g. "+99999991001", may be absent
  zoneId?: string;               // Nokia subscriptionId or zone _id, may be absent
  coordinates?: {
    lat: number;
    lng: number;
  };
  vesScore?: number;             // 0–100; absent until scoring complete
  vesTier?: VesTier;             // absent until scoring complete
  vesBreakdown?: Record<string, number>;  // e.g. { "simSwap": -30, "locationVerify": 20 }
  vesApiResults?: VesApiResult[];
  signalId: string;              // ref to Signal document (internal, rarely shown to user)
  scoredAt?: string;             // ISO timestamp
  triage?: TriageResult;         // absent until triage runs (HIGH/CRITICAL only in v1)
  triageError?: string;          // populated if Claude failed
  triagedAt?: string;            // ISO timestamp
  pipelineVersion?: "v1" | "v2";
  agentReasoning?: string;       // v2 only — Claude narrative
  toolsCalledCount?: number;     // v2 only — how many CAMARA tools Claude called
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}

interface TriageResult {
  severity: "LOW" | "HIGH" | "CRITICAL";
  incidentType: string;          // e.g. "ROAD_ACCIDENT"
  escalationRisk: number;        // 0–100
  summary: string;               // 1–2 sentence dispatcher summary from Claude
  recommendedAction: string;     // one specific action instruction
  confidenceNote: string;        // what would change this assessment
}

interface VesApiResult {
  apiName: string;               // "simSwap" | "deviceSwap" | "locationVerify" | "numberVerify" | "roaming" | "callForwarding"
  latencyMs: number;
  result: unknown;               // raw Nokia API response (varies per API)
  success: boolean;
}
```

### Enums

```typescript
enum IncidentStatus {
  PENDING    = "PENDING",      // signal ingested, pipeline not started
  SCORING    = "SCORING",      // VES scoring running
  WATCH      = "WATCH",        // score 41–65
  HIGH       = "HIGH",         // score 66–85
  CRITICAL   = "CRITICAL",     // score 86–100
  DISMISSED  = "DISMISSED",    // score 0–40, or manually dismissed
  DISPATCHED = "DISPATCHED",   // responders deployed
  RESOLVED   = "RESOLVED",     // incident closed
}

enum VesTier {
  DISMISSED = "DISMISSED",     // 0–40
  WATCH     = "WATCH",         // 41–65
  HIGH      = "HIGH",          // 66–85
  CRITICAL  = "CRITICAL",      // 86–100
}

enum SignalSource {
  GEOFENCE      = "GEOFENCE",       // Nokia geofence event (passive)
  CONGESTION    = "CONGESTION",     // Nokia network congestion
  DEVICE_STATUS = "DEVICE_STATUS",  // Nokia device status
  USSD          = "USSD",           // Africa's Talking USSD (human report)
  SMS           = "SMS",
}

enum IncidentType {
  ROAD_ACCIDENT = "ROAD_ACCIDENT",
  FIRE          = "FIRE",
  FLOOD         = "FLOOD",
  CROWD_CRUSH   = "CROWD_CRUSH",
  MEDICAL       = "MEDICAL",
  DOMESTIC      = "DOMESTIC",
  UNKNOWN       = "UNKNOWN",
}
```

### Status Transition Rules (for showing/hiding buttons)

| Current Status | Can Dispatch? | Can Dismiss? | Can Resolve? |
|----------------|:---:|:---:|:---:|
| PENDING | | ✓ | |
| SCORING | | ✓ | |
| WATCH | ✓ | ✓ | |
| HIGH | ✓ | ✓ | |
| CRITICAL | ✓ | ✓ | |
| DISMISSED | | | |
| DISPATCHED | | | ✓ |
| RESOLVED | | | |

---

## 4. Zones

### GET `/api/zones` — list all zones
**Auth required.**

Returns a **flat array** (no pagination object).

**Response 200:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": [ /* Zone[] */ ]
}
```

---

### POST `/api/zones` — create zone
**Auth required.**

**CRITICAL: body uses flat `lat`/`lng`, NOT `{ center: { lat, lng } }`.**

```json
{
  "name": "Ikeja Lagos",
  "lat": 6.601338,
  "lng": 3.351485,
  "radius": 2000
}
```

**Validation:**
- `name` — string, min 1 char, required
- `lat` — number, required
- `lng` — number, required
- `radius` — number, minimum 100 (metres), required

**What happens on create:**
1. Zone saved to MongoDB
2. Backend calls Nokia CAMARA geofencing API to register a subscription
3. Nokia fires an immediate webhook event (`initialEvent: true`) which creates a real incident
4. `subscriptionId` is saved back to the zone

**Response 201:**
```json
{
  "status": "success",
  "statusCode": 201,
  "data": {
    "_id": "6627f3e2a1b2c3d4e5f60001",
    "name": "Ikeja Lagos",
    "lat": 6.601338,
    "lng": 3.351485,
    "radius": 2000,
    "subscriptionId": "557a021d-...",
    "active": true,
    "createdAt": "2025-05-05T10:00:00.000Z",
    "updatedAt": "2025-05-05T10:00:00.000Z"
  }
}
```

---

### GET `/api/zones/:id` — get zone by ID
**Auth required.**

**Response 200:** `{ "status": "success", "statusCode": 200, "data": Zone }`  
**Response 404:** `{ "status": "error", "statusCode": 404, "message": "Zone <id> not found" }`

---

### PATCH `/api/zones/:id` — update zone
**Auth required.**

**Body (all optional):**
```json
{
  "name": "Ikeja Central",
  "active": false
}
```

When `active` changes value, a `zone:updated` WebSocket event fires.

**Response 200:** `{ "status": "success", "statusCode": 200, "data": Zone }`  
**Response 404:** not found

---

### DELETE `/api/zones/:id` — delete zone
**Auth required. No body.**

Also cancels the Nokia geofence subscription.

**Response 204:** empty body  
**Response 404:** not found

---

### Zone Object Shape

```typescript
interface Zone {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;              // metres
  subscriptionId?: string;     // Nokia geofence subscription ID; absent if Nokia subscription failed
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. Wardens

### POST `/api/wardens` — register warden
**Auth required.**

```json
{
  "name": "Amara Okonkwo",
  "phoneNumber": "+2348012345678",
  "zoneId": "6627f3e2a1b2c3d4e5f60001",
  "idDocument": "66666666q"
}
```

**Validation:**
- `name` — string, min 2 chars, required
- `phoneNumber` — E.164 format: `+` then country code then number, e.g. `+2348012345678`, required
- `zoneId` — string MongoDB ObjectId, optional
- `idDocument` — string, optional (government ID number for Nokia KYC)

**KYC behaviour:**
- Created immediately with `status: "PENDING"`
- BullMQ job runs KYC asynchronously (~3–8 seconds)
- `warden:kyc-complete` WebSocket event fires when done
- **Nokia sandbox:** name matching always fails for test numbers. Pass `idDocument: "66666666q"` to get VERIFIED

**Response 201:**
```json
{
  "status": "success",
  "statusCode": 201,
  "data": {
    "_id": "6627f3e2a1b2c3d4e5f60010",
    "name": "Amara Okonkwo",
    "phoneNumber": "+2348012345678",
    "zoneId": "6627f3e2a1b2c3d4e5f60001",
    "status": "PENDING",
    "idDocument": "66666666q",
    "createdAt": "2025-05-05T10:00:00.000Z",
    "updatedAt": "2025-05-05T10:00:00.000Z"
  }
}
```

**Response 409:** duplicate phone number  
**Response 400:** validation failure

---

### GET `/api/wardens` — list wardens (paginated)
**Auth required.**

**Query parameters (all optional):**

| Param | Type | Description |
|-------|------|-------------|
| `page` | integer ≥ 1 | default: 1 |
| `limit` | integer 1–100 | default: 20 |
| `status` | WardenStatus enum | `PENDING` \| `VERIFIED` \| `REJECTED` \| `INACTIVE` |
| `zoneId` | string | filter by zone |

**Response 200:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "data": [ /* Warden[] */ ],
    "pagination": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
  }
}
```

---

### GET `/api/wardens/:id` — get warden by ID
**Auth required.**

**Response 200:** `{ "status": "success", "statusCode": 200, "data": Warden }`  
**Response 404:** not found

---

### PATCH `/api/wardens/:id/deactivate` — deactivate warden
**Auth required. No body.**

Sets warden status to INACTIVE.

**Response 200:** `{ "status": "success", "statusCode": 200, "data": Warden }`  
**Response 404:** not found

> **Note:** There is no general PATCH on wardens. The only update is deactivate.
> There is no DELETE endpoint for wardens.

---

### Warden Object Shape

```typescript
enum WardenStatus {
  PENDING  = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  INACTIVE = "INACTIVE",
}

interface Warden {
  _id: string;
  name: string;
  phoneNumber: string;
  zoneId?: string;
  status: WardenStatus;
  idDocument?: string;         // government ID number submitted at registration
  kycMatchResult?: string;     // Nokia name match: "true" | "false"
  kycDocumentMatch?: string;   // Nokia ID document match: "true" | "false"
  kycMatchScore?: number;      // 0–100 confidence score from Nokia
  kycTenureMonths?: number | null;  // always null in Nokia sandbox
  createdAt: string;
  updatedAt: string;
}
```

---

## 6. Simulation

Used to inject demo scenarios into the real pipeline. The signal goes through the same queues and processors as a real Nokia event or USSD call.

### POST `/api/simulate/:scenario` — trigger scenario
**Auth required.**

**Scenario values (exact strings):**
```
road-accident
flood
stampede
fraud-false-alarm
ussd-trigger
```

**Body (optional):**
```json
{ "version": "v2" }
```
- `version` must be `"v1"` or `"v2"` exactly — any other value → 400
- Omit body entirely to default to `"v1"`

**Response 202 — raw object (NO standard envelope):**
```json
{
  "accepted": true,
  "scenario": "road-accident",
  "jobId": "1234",
  "pipelineVersion": "v1"
}
```

**Response 400:** invalid scenario name or invalid version

**What each scenario does:**

| Scenario | Source | Type | Phone | Expected outcome |
|----------|--------|------|-------|-----------------|
| `road-accident` | GEOFENCE | NETWORK_PASSIVE | +99999991001 | HIGH/CRITICAL incident |
| `flood` | CONGESTION | NETWORK_PASSIVE | +99999991001 | HIGH/CRITICAL incident |
| `stampede` | GEOFENCE | NETWORK_PASSIVE | +99999991001 | HIGH/CRITICAL incident |
| `fraud-false-alarm` | USSD | HUMAN | +99999991000 (SIM-swapped) | DISMISSED incident |
| `ussd-trigger` | USSD | HUMAN | +99999991001 | WATCH/HIGH incident |

**Pipeline v1 vs v2:**

| | v1 | v2 |
|-|----|----|
| Flow | 6 CAMARA API calls in parallel → VES score → Claude triage | Claude agent decides which APIs to call, calls them sequentially, produces combined VES + triage |
| Triage | Only HIGH and CRITICAL incidents | All incidents |
| Speed | ~8–12 seconds | ~15–30 seconds |
| WS events | scoring-started → 6x api-call → ves-complete → triage-complete | scoring-started → agent-tool-plan → Nx api-call → ves-complete → triage-complete → agent-reasoning |

---

## 7. WebSocket Events (Socket.io)

**Install:** `npm install socket.io-client`

**Connect:**
```typescript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  transports: ["websocket"],
});

socket.on("connect", () => console.log("WS connected:", socket.id));
socket.on("disconnect", () => console.warn("WS disconnected"));
```

All events are broadcast to all connected clients. There are no rooms or namespaces.

---

### `incident:new`
Fires when a new incident is created — pipeline has not started yet.

```typescript
{
  incidentId: string;
  status: "PENDING";
  source: SignalSource;     // "GEOFENCE" | "USSD" | "CONGESTION" | etc.
  type: IncidentType;       // "ROAD_ACCIDENT" | "FLOOD" | etc.
  timestamp: string;        // ISO timestamp
}
```

**UI action:** Prepend new card to incident feed with PENDING badge and loading spinner.

---

### `incident:scoring-started`
Fires when VES scoring begins.

```typescript
{
  incidentId: string;
  status: "SCORING";
}
```

**UI action:** Update card to "Scoring…" with animated indicator.

---

### `incident:api-call`
Fires once per CAMARA API call, in real-time as each call completes.
- **v1:** fires 6 times, roughly in parallel (all arrive within ~200ms of each other)
- **v2:** fires N times, sequentially as Claude decides each tool call

```typescript
{
  incidentId: string;
  apiName: string;       // "simSwap" | "deviceSwap" | "locationVerify" | "numberVerify" | "roaming" | "callForwarding"
                         // v2 may also use: "check_sim_swap" | "verify_location" | "get_congestion" | etc.
  result: unknown;       // Nokia API response object (structure varies per API)
  latencyMs: number;
  success: boolean;
}
```

**UI action:** Add a row to a live "API call log" table on the incident card. Show apiName, latency, and a pass/fail badge.

---

### `incident:agent-tool-plan`
v2 only. Fires at the start of agentic processing, before any tools are called.

```typescript
{
  incidentId: string;
  availableTools: string[];   // list of Nokia MCP tool names Claude can use
}
```

**UI action:** Show "Agent planning…" state. Display available tools list.

---

### `incident:ves-complete`
Fires when VES scoring is complete and score saved to DB.

```typescript
{
  incidentId: string;
  score: number;                              // 0–100
  tier: VesTier;                              // "DISMISSED" | "WATCH" | "HIGH" | "CRITICAL"
  breakdown: Record<string, number | object>; // v1: { simSwap: -30, locationVerify: 20, signalType: 10 }
                                              // v2: { simSwap: { delta: -30, result: "...", reasoning: "..." } }
  status: IncidentStatus;                     // mirrors tier as status
}
```

**UI action:** Update card with score gauge (0–100), tier badge (colour-coded), breakdown table.

**Tier colours:**
- CRITICAL → red
- HIGH → orange
- WATCH → yellow
- DISMISSED → grey

---

### `incident:triage-complete`
Fires when Claude triage is complete.
- **v1:** only fires for HIGH and CRITICAL incidents
- **v2:** fires for every incident

```typescript
{
  incidentId: string;
  triage: {
    severity: "LOW" | "HIGH" | "CRITICAL";
    incidentType: string;
    escalationRisk: number;     // 0–100
    summary: string;            // 1–2 sentences for the dispatcher
    recommendedAction: string;  // single specific instruction
    confidenceNote: string;     // what would change this assessment
  } | null;                     // null if triage failed
  tier: VesTier;
  score: number;
  error?: boolean;              // true if triage errored
}
```

**UI action:** Display Claude's summary prominently. Show escalation risk bar. Highlight recommended action. If `triage` is null, show "Triage unavailable" state.

---

### `incident:agent-reasoning`
v2 only. Fires after triage with Claude's narrative explanation.

```typescript
{
  incidentId: string;
  reasoning: string;          // 2–3 sentences on how Claude reached its conclusion
  toolsCalledCount: number;   // total number of CAMARA API calls Claude made
}
```

**UI action:** Show expandable "Agent reasoning" section below the triage card.

---

### `incident:status-changed`
Fires when a dispatcher manually dispatches, dismisses, or resolves an incident.

```typescript
{
  incidentId: string;
  status: IncidentStatus;    // the new status
  updatedAt: string;         // ISO timestamp
}
```

**UI action:** Update badge on incident card in real-time (affects all open browser tabs simultaneously).

---

### `warden:kyc-complete`
Fires when the background KYC job finishes for a warden (~3–8 seconds after registration).

```typescript
{
  wardenId: string;
  status: WardenStatus;       // "VERIFIED" | "REJECTED"
  kycMatchScore?: number;     // confidence score, may be absent
}
```

**UI action:** Update warden row status badge. Show success toast for VERIFIED ("Warden verified via Nokia KYC"), error toast for REJECTED ("Warden KYC failed").

---

### `zone:updated`
Fires when a zone's `active` field changes.

```typescript
{
  zoneId: string;
  active: boolean;
  name: string;
}
```

**UI action:** Update zone card active/inactive indicator.

---

## 8. Dashboard — What to Show

### KPI Cards (top row)

Fetch using `limit=1` and read `pagination.total` — efficient, doesn't load data.

```
Active incidents:      GET /api/incidents?status=WATCH&limit=1
                       GET /api/incidents?status=HIGH&limit=1
                       GET /api/incidents?status=CRITICAL&limit=1
                       (sum the three totals)

Critical now:          GET /api/incidents?tier=CRITICAL&limit=1

Dispatched today:      GET /api/incidents?status=DISPATCHED&from=<today 00:00 UTC>&limit=1

Verified wardens:      GET /api/wardens?status=VERIFIED&limit=1
```

### Incident Feed

- Primary: driven by WebSocket events (`incident:new` prepends cards, other events update existing ones)
- Fallback: poll `GET /api/incidents?limit=20` every 30 seconds
- Default sort: `createdAt` descending (most recent first — this is the backend default)
- Each card shows: source badge, type badge, phone, time elapsed, VES score gauge, tier badge, status, Claude summary (from `triage.summary`)
- Show dispatch/dismiss/resolve buttons per the transition table in Section 3

### Incident Card — Live API Call Log

As `incident:api-call` events fire, build a table:

```
API Call          Status    Latency
simSwap           ✓         42ms
deviceSwap        ✓         38ms
locationVerify    ✓         91ms
numberVerify      ✓         55ms
roaming           ✓         33ms
callForwarding    ✓         44ms
```

This is what makes the live demo compelling — the dispatcher sees each Nokia network check arriving in real-time.

---

## 9. Live Demo Flow (Hackathon Presentation Sequence)

Run these steps during the demo:

1. **Login** — enter admin secret, get JWT
2. **Dashboard loads** — shows existing incidents if any
3. **Create a zone:**
   ```json
   POST /api/zones
   { "name": "Ikeja Lagos", "lat": 6.601338, "lng": 3.351485, "radius": 2000 }
   ```
   → Nokia subscription created automatically, `subscriptionId` populated on zone
   → Nokia also fires an `initialEvent` webhook immediately — watch a GEOFENCE incident appear in the feed

4. **Register a warden:**
   ```json
   POST /api/wardens
   { "name": "Chidi Okeke", "phoneNumber": "+99999991001", "idDocument": "66666666q" }
   ```
   → Created with PENDING status
   → ~5 seconds later: `warden:kyc-complete` fires → status becomes VERIFIED

5. **Trigger v1 simulation:**
   ```json
   POST /api/simulate/road-accident
   (no body)
   ```
   → Watch WebSocket: `incident:new` → `incident:scoring-started` → 6× `incident:api-call` → `incident:ves-complete` → `incident:triage-complete`
   → Total time: ~10–15 seconds

6. **Dispatch the incident:**
   ```
   POST /api/incidents/:id/dispatch
   ```
   → `incident:status-changed` fires, card updates to DISPATCHED

7. **Trigger v2 agentic simulation:**
   ```json
   POST /api/simulate/road-accident
   { "version": "v2" }
   ```
   → Watch: `incident:agent-tool-plan` → N× `incident:api-call` (sequential, Claude decides order) → `incident:ves-complete` → `incident:triage-complete` → `incident:agent-reasoning`
   → Total time: ~20–30 seconds

8. **Show fraud scenario:**
   ```json
   POST /api/simulate/fraud-false-alarm
   { "version": "v2" }
   ```
   → Phone `+99999991000` is SIM-swapped → Claude detects it → score ≤40 → DISMISSED tier
   → Demonstrates AI fraud filtering

---

## 10. Error Handling Reference

| HTTP | When | What to show |
|------|------|-------------|
| 400 | Missing field, wrong type, unknown field, invalid enum | Show validation message from `message` field |
| 401 | No JWT, expired JWT, wrong admin secret | Redirect to login |
| 404 | Zone/warden/incident not found | Show "Not found" in the relevant UI section |
| 409 | Duplicate phone, invalid status transition | Show `message` as inline error |
| 429 | Rate limit exceeded (100 req/min) | Show "Too many requests, please wait" |
| 503 | Infrastructure down (health check) | Show system-down banner |

---

## 11. Backend-Only Endpoints (no frontend interaction needed)

These exist in the backend but are called by Nokia and Africa's Talking, not by the frontend:

| Endpoint | Called by |
|----------|-----------|
| `POST /api/webhooks/nokia` | Nokia CAMARA geofencing service |
| `POST /api/webhooks/ussd` | Africa's Talking USSD gateway |

Both are `@Public()` — no JWT. The Nokia one requires `Authorization: Bearer <NOKIA_WEBHOOK_SECRET>` header. The USSD one requires `apikey` header. Frontend never calls these.

---

## 12. Frontend Tech Stack Recommendation

- **Framework:** Next.js 14+ or React + Vite
- **WebSocket:** `socket.io-client` package — **must use this, not native `WebSocket`**. The backend uses Socket.io protocol which is incompatible with raw WebSocket clients.
- **HTTP:** `fetch` or `axios` with a wrapper that adds the `Authorization` header automatically
- **State management:** Zustand (for WebSocket event accumulation) + React Query (for REST data fetching and caching)
- **UI:** Tailwind CSS + shadcn/ui or Chakra UI
- **Maps (zone visualisation):** Leaflet or Mapbox GL JS (render zone circles using lat/lng/radius)

### Minimal HTTP wrapper

```typescript
const API = "http://localhost:3000/api";
let jwt = "";

export function setToken(token: string) { jwt = token; }

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      ...(options.headers ?? {}),
    },
  });

  // health check is at /health, not /api/health — call it directly
  const body = await res.json() as { status: string; data?: T; message?: string };

  if (!res.ok || body.status === "error") {
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }

  return body.data as T;
}
```

### Socket.io connection with typed events

```typescript
import { io } from "socket.io-client";

export const socket = io("http://localhost:3000", {
  transports: ["websocket"],
  autoConnect: true,
});

// Events arrive as plain objects — the payload is the direct argument
socket.on("incident:new", (payload) => {
  // payload = { incidentId, status, source, type, timestamp }
});

socket.on("incident:ves-complete", (payload) => {
  // payload = { incidentId, score, tier, breakdown, status }
});

socket.on("incident:triage-complete", (payload) => {
  // payload = { incidentId, triage, tier, score, error? }
});

socket.on("warden:kyc-complete", (payload) => {
  // payload = { wardenId, status, kycMatchScore? }
});
```
