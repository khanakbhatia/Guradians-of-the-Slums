# API Architecture — v1

Structure and conventions only. No controller/service code — this is the
contract routes/auth.routes.js and every future `<resource>.routes.js`
must follow.

---

## 1. Versioning

- **Strategy:** URI versioning — `/api/v1/...`
- **Mount path:** `app.use('/api/v1', v1Router)` in `app.js`
- `routes/index.js` becomes `routes/v1/index.js`, aggregating one router
  per resource, exactly as `auth.routes.js` already does
- A future `/api/v2` mounts alongside `/api/v1` without touching it —
  old clients keep working during a breaking change
- Deprecated versions respond with a `Deprecation: true` and `Sunset: <date>`
  header (RFC 8594) instead of being removed outright
- `/api/health` stays unversioned (infra/uptime checks shouldn't break on a version bump)

```
/api/health                  (unversioned)
/api/v1/auth/...             (built)
/api/v1/users/...
/api/v1/risk-zones/...
/api/v1/incidents/...
/api/v1/volunteers/...
/api/v1/authorities/...
/api/v1/citizen-reports/...
/api/v1/tasks/...
/api/v1/notifications/...
/api/v1/chat-rooms/...
/api/v1/activity-logs/...
```

---

## 2. Global Middleware Stack (order matters)

```
1.  helmet()                      — security headers
2.  cors({ credentials: true })   — origin allow-list, cookies enabled
3.  express.json()
4.  express.urlencoded()
5.  cookieParser()
6.  requestId()                   — NEW: attaches req.id (uuid), echoed as X-Request-Id header
7.  morgan(:id format)            — request logging, includes req.id for trace correlation
8.  /api/health                   — mounted before versioning, no auth
9.  /api/v1 router                — see per-resource middleware below
10. notFound                      — unmatched routes → 404 ApiError
11. errorHandler                  — must be last; only error-handling middleware in the stack
```

**Per-route layering (inside each resource router), applied in this order:**

```
rateLimiter (only on auth/write-sensitive routes)
  → protect            (JWT verify, attaches req.user)
    → authorize(...roles)   (RBAC gate)
      → ownership check      (e.g. "is this volunteer's own task", where applicable)
        → validators (express-validator chains)
          → validateRequest   (formats validation errors)
            → controller
```

Read-only public endpoints (e.g. `GET /risk-zones` for the public heatmap)
skip `protect`/`authorize` entirely — documented per-resource below.

---

## 3. Standard Response Envelope

Every response — success or error — is JSON with a `success` boolean at
the top level. No endpoint returns a bare array or bare object.

**Success:**
```
{
  "success": true,
  "message": "Human-readable summary",
  "data": { ... } | [ ... ] | null,
  "meta": { ... pagination block, only present on list endpoints }
}
```

**Error:**
```
{
  "success": false,
  "message": "Human-readable summary",
  "code": "MACHINE_READABLE_CODE",
  "errors": [ { "field": "email", "message": "..." } ]   // only on 422 validation errors
}
```

- `data` is always the key for payload — never `result`, `payload`, `user`, etc. at the top level
- `message` is always present, even on success, even if generic ("OK")
- `errors` array only appears for `422` validation failures; single-fault errors (404, 409, 403) carry just `message` + `code`

---

## 4. Pagination

Two modes, chosen per resource by access pattern:

### 4a. Offset pagination (default — bounded collections)
Used by: RiskZone, Incident, Volunteer, Authority, CitizenReport, Task

**Request:**
```
GET /api/v1/tasks?page=1&limit=20
```
- `page` — 1-indexed, default `1`
- `limit` — default `20`, max `100` (server clamps, never errors on overflow)

**Response `meta`:**
```
"meta": {
  "page": 1,
  "limit": 20,
  "totalItems": 143,
  "totalPages": 8,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

### 4b. Cursor pagination (append-only / high-volume feeds)
Used by: Message, Notification, ActivityLog — offset pagination degrades
(and can skip/duplicate items) on collections that grow continuously
while a user is paging through them.

**Request:**
```
GET /api/v1/chat-rooms/:id/messages?limit=30&cursor=<opaque_cursor>
```
- `cursor` — opaque, base64 of `{ createdAt, _id }` from the last item of the previous page (compound cursor avoids collisions when multiple docs share a timestamp)
- omit `cursor` for the first page

**Response `meta`:**
```
"meta": {
  "limit": 30,
  "nextCursor": "<opaque_cursor>" | null
}
```

---

## 5. Filtering

Convention: **plain query params for exact match, bracket operators for
comparisons.** Each resource route declares an explicit filter
whitelist — unlisted params are silently ignored, never passed through
to the DB query unfiltered.

```
?status=open                       exact match
?priority=high,critical            IN — comma-separated
?riskScore[gte]=60                 >=
?riskScore[lte]=90                 <=
?createdAt[gte]=2026-08-01         range on dates
?settlement=Dharavi                exact match
?skills=medical,rescue             IN — matches any
```

Supported operators: `gte`, `lte`, `gt`, `lt`, `ne`. Anything else
in brackets → `400`.

**Per-resource filter whitelist (examples — full list lives in each route file):**
| Resource | Filterable fields |
|---|---|
| RiskZone | `settlement`, `hazardType`, `riskLevel`, `riskScore[gte\|lte]` |
| Incident | `status`, `severity`, `type`, `riskZone` |
| Task | `status`, `priority`, `taskType`, `assignedVolunteer`, `incident` |
| Volunteer | `skills`, `availability`, `verified`, `trustScore[gte]` |
| CitizenReport | `status`, `hazardType`, `reliabilityScore[gte]` |
| Notification | `type`, `isRead`, `channel` |

---

## 6. Sorting

```
?sort=-createdAt              descending createdAt (default on most list endpoints)
?sort=riskScore                ascending riskScore
?sort=-priority,createdAt      multi-field: descending priority, then ascending createdAt
```

- `-` prefix = descending, no prefix = ascending
- Each resource declares a **sortable field whitelist**; requesting a
  non-whitelisted field → `400`, not a silent no-op
- Every resource has a documented **default sort** so `meta`/ordering is
  deterministic even with no `?sort` param (e.g. Task defaults to
  `-priority,-createdAt`; Message defaults to `-createdAt`)

---

## 7. Error Handling

Single `errorHandler`, already established, extended with a `code` field
for machine-readable branching on the frontend (avoids string-matching
`message`).

| HTTP Status | `code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | malformed query param, invalid filter/sort field |
| 401 | `AUTH_REQUIRED` / `INVALID_TOKEN` / `TOKEN_EXPIRED` | missing/bad/expired JWT |
| 403 | `FORBIDDEN` | authenticated but wrong role, or not resource owner |
| 404 | `NOT_FOUND` | resource id doesn't exist |
| 409 | `CONFLICT` | duplicate unique field (email, blockId, etc.) |
| 422 | `VALIDATION_ERROR` | express-validator failures — includes `errors[]` |
| 429 | `RATE_LIMITED` | rate limiter tripped |
| 500 | `INTERNAL_ERROR` | unhandled — logged server-side, generic message to client |

- `ApiError(statusCode, message, errors?, code?)` gains the `code` param
- Stack traces only ever appear when `NODE_ENV !== 'production'`
- Mongoose `CastError` (bad ObjectId in a URL param) → `400 BAD_REQUEST`, not `500`

---

## 8. Route Structure Template (applies to every resource)

Using `Task` as the reference example — same shape for RiskZone, Incident,
Volunteer, Authority, CitizenReport, Notification, ChatRoom:

```
GET    /api/v1/tasks                 list      paginated, filterable, sortable
GET    /api/v1/tasks/:id             detail
POST   /api/v1/tasks                 create    protect, authorize(authority, admin)
PATCH  /api/v1/tasks/:id             update    protect, authorize(authority, admin) + ownership
DELETE /api/v1/tasks/:id             delete    protect, authorize(admin)

-- resource-specific actions, not CRUD --
POST   /api/v1/tasks/:id/claim       protect, authorize(volunteer)
POST   /api/v1/tasks/:id/accept      protect, authorize(volunteer) + ownership
POST   /api/v1/tasks/:id/complete    protect, authorize(volunteer) + ownership
```

**Sub-resource nesting** (only where the child is meaningless without the parent):
```
GET  /api/v1/chat-rooms/:id/messages         cursor-paginated
POST /api/v1/chat-rooms/:id/messages         protect, must be a room participant
GET  /api/v1/risk-zones/:id/incidents        offset-paginated
GET  /api/v1/incidents/:id/tasks             offset-paginated
GET  /api/v1/incidents/:id/citizen-reports   offset-paginated
```

**Never nest more than one level deep** — `GET /risk-zones/:id/incidents/:id/tasks`
becomes its own top-level `GET /tasks?incident=:id` filter instead.

---

## 9. HTTP Status Code Conventions

| Action | Success status |
|---|---|
| `GET` (list or detail) | `200` |
| `POST` (create) | `201` |
| `POST` (action, e.g. `/claim`, `/verify`) | `200` |
| `PATCH` (update) | `200` |
| `DELETE` | `204` (no body) |

- `204` responses have **no** JSON body (not even the envelope) — the
  absence of content is the signal, per HTTP semantics
- Every other status returns the envelope from Section 3

---

## 10. Open Decisions for the Team

- **Ownership check granularity** — does a volunteer see only their own
  assigned tasks by default (`GET /tasks?mine=true`), or is that a
  separate `GET /tasks/mine` endpoint? Pick one convention before M1
  builds the Volunteer Task View.
- **CitizenReport `/verify` and `/flag` actions** — who can call them
  (`authority` only, or `admin` too)? Needs to match the trust-scoring
  logic from the schema doc.
- **RiskZone writes** — are these ever created via the REST API, or
  exclusively by the CV/agent pipeline writing directly to Mongo? If
  the latter, `POST /risk-zones` may not need to exist as a public route
  at all.
