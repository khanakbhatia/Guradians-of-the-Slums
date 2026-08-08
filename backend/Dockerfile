# syntax=docker/dockerfile:1

# ---- Base ----
# node:20-alpine keeps the image small. sharp (>=0.32) ships prebuilt
# binaries for linux-musl, so it installs cleanly here without a compiler
# toolchain — if that ever changes, switch to node:20-slim (glibc/Debian)
# as the documented fallback (see DEPLOYMENT.md).
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencies (own layer so `npm ci` is cached unless package*.json changes) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- Runtime ----
FROM base AS runtime
ENV NODE_ENV=production

# Run as a non-root user — never the container default (root). Alpine's
# node image ships a "node" user/group (uid/gid 1000) for exactly this.
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

# Referenced by config/logger.js at runtime; created here so the
# non-root user can write to it (a bind-mounted host directory would
# need the same ownership on the host side — see DEPLOYMENT.md).
RUN mkdir -p logs uploads && chown -R node:node logs uploads

USER node

EXPOSE 5000

# Platform-level health check (Docker, and anything reading Docker's own
# health status e.g. `docker ps`, Swarm, some Compose setups). Railway/
# Render have their own separate HTTP health-check config pointed at the
# same /api/health path — see DEPLOYMENT.md.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||5000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Exec form (no shell) is required for server.js's SIGTERM/SIGINT
# handlers to actually receive the signal directly — the shell form
# ("node server.js") runs under /bin/sh, which swallows the signal
# instead of forwarding it, breaking graceful shutdown.
CMD ["node", "server.js"]
