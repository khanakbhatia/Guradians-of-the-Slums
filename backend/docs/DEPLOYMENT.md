# Deployment Guide

Everything needed to take this backend from local dev to a running
production deployment: environment variables, MongoDB Atlas, Docker,
and two ready-to-use platform configs (Railway, Render).

---

## 1. Prerequisites

- A MongoDB Atlas cluster (Section 2)
- A Cloudinary account (avatars, citizen-report photos, chat attachments, satellite/document media)
- An SMTP credential for outbound email (email verification, password reset) — any provider works; the app just needs host/port/user/pass
- Node.js 20+ if running outside Docker (see `package.json`'s `engines` field)
- Docker, if deploying via container (Section 4) — Railway and Render can also build directly from the Dockerfile without you running Docker locally

---

## 2. MongoDB Atlas Setup

1. Create a free ([M0](https://www.mongodb.com/pricing)) or paid cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → add a database user with a strong, generated password (not your Atlas login password). Give it `readWrite` on the target database only — not an admin role.
3. **Network Access** → add an IP allowlist entry.
   - For Railway/Render: both use dynamic egress IPs on standard plans, so the practical option is **Allow Access from Anywhere** (`0.0.0.0/0`). This is safe *only* because the database itself is protected by the user/password from step 2 and (ideally) Atlas's own network encryption — it is not the same as leaving the database unauthenticated.
   - If your plan supports static outbound IPs (Render's paid tiers, Railway's static IP add-on), allowlist those specific IPs instead and skip `0.0.0.0/0`.
4. **Connect** → "Drivers" → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Add your database name to the path and set it as `MONGO_URI`:
   ```
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/guardians_platform?retryWrites=true&w=majority
   ```
6. Verify indexes: every model in this codebase already declares its own indexes (`schema.index(...)`) — Mongoose creates them automatically on first connection in a non-production-optimized way (`autoIndex` defaults to `true`). For a high-traffic production cluster, consider setting `mongoose.set('autoIndex', false)` and running index creation as a one-off deploy step instead — not necessary at launch scale, worth revisiting if the collections grow large.

---

## 3. Environment Variables

Copy `.env.example` to `.env` for local dev; on a platform, set these in
its dashboard (never commit real secrets). `config/validateEnv.js` checks
these at boot — the app **refuses to start** if a required one is missing,
and logs a warning (but still starts) if a recommended one is missing.

| Variable | Required? | Notes |
|---|---|---|
| `NODE_ENV` | required | Set to `production` on every deployed environment — gates CSP relaxation, console logging, error stack exposure, and the recommended-vars check |
| `PORT` | no (defaults 5000) | Railway/Render inject this automatically — don't hardcode a different value on those platforms |
| `MONGO_URI` | **required** | From Atlas, Section 2 |
| `JWT_SECRET` | **required** | Long, random — generate with `openssl rand -hex 32`. `validateEnv` warns if under 32 characters |
| `CLIENT_URL` | no (defaults localhost) | Your deployed frontend's origin — used for CORS and links in emails |
| `ALLOWED_ORIGINS` | no | Comma-separated extra CORS origins (e.g. a staging frontend) alongside `CLIENT_URL` |
| `JWT_EXPIRES_IN` | no (default `15m`) | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | no (default `30`) | Refresh token lifetime |
| `REFRESH_TOKEN_COOKIE_NAME` | no | Cookie name for the refresh token |
| `EMAIL_VERIFICATION_TTL_HOURS` / `PASSWORD_RESET_TTL_MINUTES` | no | Token TTLs |
| `REQUIRE_EMAIL_VERIFICATION` | no (default `false`) | See the note in the auth implementation — deliberately off by default so a disaster alert isn't gated behind email verification |
| `BCRYPT_SALT_ROUNDS` | no (default `10`) | Password hashing cost |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | **required in production** | All file uploads (avatars, report photos, chat attachments, satellite/document media) fail without these |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_SECURE` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | **required in production** | Outbound SMTP — verification/reset emails fail without these |
| `MORGAN_FORMAT` | no (default `dev`) | Use `combined` in production (fuller access-log format) |
| `WINSTON_LOG_LEVEL` | no (default `debug` in dev, `info` in prod) | Set explicitly if you want a different level |
| `LOG_RETENTION_DAYS` | no (default `14`) | How long rotated log files are kept — see Section 6 note on log persistence |
| `MONGO_DEBUG_LOGGING` | no (default `false`) | Leave `false` in any shared environment — query filters can contain values you don't want in a log file |
| `WATSONX_*` / `GRANITE_*` / `BEEAI_*` / `RAG_*` / `DATAPREP_*` | no | IBM service-layer credentials — unused until `services/ibm/*`'s AI logic is implemented; safe to leave blank |

---

## 4. Docker

The repo includes a multi-stage `Dockerfile` and `.dockerignore`.

**Build and run locally:**
```bash
docker build -t guardians-backend .
docker run -p 5000:5000 --env-file .env guardians-backend
```

**Design notes:**
- **Base image**: `node:20-alpine`. `sharp` (used for image compression) ships prebuilt binaries for Alpine's musl libc on modern versions, so no compiler toolchain is needed in the image. If a future `sharp` upgrade ever breaks on Alpine, switch the base to `node:20-slim` (Debian/glibc) as documented fallback.
- **Multi-stage build**: dependencies install in their own layer (`deps`), cached separately from the app code — changing a source file doesn't force a full `npm ci` re-run.
- **Non-root user**: runs as the image's built-in `node` user, not root.
- **`logs/` and `uploads/` are created and chowned in the image** for the non-root user to write to. If you bind-mount either directory from the host (to persist logs outside the container), match ownership on the host side or writes will fail silently.
- **Exec-form `CMD`** (`["node", "server.js"]`, not a shell string): this matters because `server.js` has real `SIGTERM`/`SIGINT` handlers for graceful shutdown (finish in-flight requests, close the Mongo connection cleanly, force-exit after a 10s safety timeout). The shell form runs under `/bin/sh`, which does not forward signals to the child process — graceful shutdown silently stops working if that ever changes.
- **`HEALTHCHECK`** hits `/api/health` with a plain Node one-liner (no `curl`/`wget` dependency to add to the image). Verified directly: a `503` (e.g. DB disconnected) correctly produces a non-zero exit code, which Docker reads as unhealthy.

---

## 5. Railway

`railway.json` is included — Railway auto-detects it.

1. Push this repo to GitHub (or connect Railway directly to your Git provider).
2. In Railway: **New Project → Deploy from GitHub repo**.
3. Railway reads `railway.json` and builds from the `Dockerfile` automatically.
4. **Variables** tab → paste in every variable from Section 3 (except `PORT`, which Railway injects itself — `env.PORT` in this codebase already respects whatever Railway provides).
5. Railway's own health check is configured via `railway.json`'s `deploy.healthcheckPath` (`/api/health`) — a deploy is only marked successful once this returns `200`.
6. **Networking** tab → generate a public domain, or attach a custom one.

---

## 6. Render

`render.yaml` (a Render **Blueprint**) is included.

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, point it at the repo. Render reads `render.yaml` and provisions the service automatically.
3. Every variable marked `sync: false` in `render.yaml` prompts you for a value in the dashboard during setup (secrets are never stored in the committed YAML) — fill in `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `ALLOWED_ORIGINS`, and all `CLOUDINARY_*`/`EMAIL_*` values from Section 3.
4. Render uses `healthCheckPath: /api/health` from the Blueprint to gate rollouts the same way Railway does.
5. **Important — ephemeral filesystem**: Render's filesystem (like Railway's, like most PaaS containers) is **not persistent across deploys/restarts** on standard plans. This app's `logs/` directory (Section 7) will be wiped on every redeploy. That's expected for a security/audit trail meant to be reviewed close to real-time or shipped elsewhere — see the note below.

---

## 7. Health Check

`GET /api/health` (unversioned, no auth required) is the single health
check every platform above points at. It's deliberately more than a
liveness ping:

```json
{
  "success": true,
  "message": "API is healthy",
  "uptime": 143,
  "timestamp": "2026-08-07T15:00:00.000Z",
  "dependencies": { "database": "connected" }
}
```

- Returns **200** only when the process is up *and* the MongoDB
  connection's `readyState` is actually `connected` — not just "the Node
  process didn't crash." A platform health check that only confirms
  liveness misses the far more common failure mode: the process is up,
  but every request 500s because the database is unreachable.
- Returns **503** (with `dependencies.database` showing `disconnected`,
  `connecting`, or `disconnecting`) otherwise — verified directly:
  hitting this endpoint with a disconnected DB state returns `503` and a
  correctly-shaped body.
- Deliberately **excluded from the `http` log channel** (see
  `middlewares/requestLogger.js`'s skip filter) — a health check firing
  every 10–30 seconds would otherwise dominate the access log.

---

## 8. Production Config Checklist

Most of this is already enforced by the code, not just documented —
listed here as a pre-launch checklist to confirm, not a to-do list:

- [ ] `NODE_ENV=production` is set — gates Helmet's CSP relaxation (kept
      strict everywhere except `/api/docs`), disables Winston's console
      transport (file-only logging), and hides stack traces from error
      responses (`middlewares/errorHandler.js`).
- [ ] `JWT_SECRET` is long and random (`validateEnv` warns below 32 chars).
- [ ] `MONGO_URI` points at Atlas, not a local/dev database.
- [ ] `CLIENT_URL` and `ALLOWED_ORIGINS` list only real frontend origins —
      CORS rejects everything else (verified in the hardening pass).
- [ ] `trust proxy` is set to `1` in `app.js` — correct for a single
      reverse proxy in front (Railway/Render/most container platforms).
      If you ever add a second proxy layer (e.g. a CDN in front of
      Railway), this number needs to change or IP-based rate limiting
      becomes spoofable.
- [ ] Rate limiting is active globally (`middlewares/rateLimiter.js`'s
      `globalLimiter`) plus tighter limits on auth endpoints — no
      per-environment toggle needed, it's always on.
- [ ] `MONGO_DEBUG_LOGGING` is `false` (the default) — verbose per-query
      logging can leak filter values into logs and costs real overhead.
- [ ] **Log persistence**: `utils/logger.js` writes to `logs/*.log` on
      the container's local disk. On Railway/Render (ephemeral
      filesystem, Section 6), these are lost on every restart/redeploy.
      For anything beyond quick post-incident grep via
      `GET /admin/logs/:channel`, ship these to persistent storage — a
      hosted log service (many have free tiers) via a Winston transport,
      or a mounted volume if your platform supports one. Not wired up
      here by default, since the right destination depends on your
      platform/budget.
- [ ] Confirm `POST /admin/users` (the very first admin account) is
      created via a one-off script or direct DB insert before relying on
      any `/admin/*` endpoint — there is intentionally no public
      "become an admin" path.

---

## 9. Post-Deploy Verification

Once deployed, confirm the basics work end-to-end:

```bash
curl https://<your-domain>/api/health
# expect: {"success":true,...,"dependencies":{"database":"connected"}}

curl https://<your-domain>/api/docs.json | head -c 200
# expect: valid OpenAPI JSON

curl -X POST https://<your-domain>/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Passw0rd123","role":"citizen"}'
# expect: 201, and a verification email actually arriving (confirms SMTP config)
```

If `/api/health` reports `dependencies.database: "disconnected"` in
production, double-check the Atlas Network Access allowlist (Section 2,
step 3) before anything else — it's the most common first-deploy failure.
