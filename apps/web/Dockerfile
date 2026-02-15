# ============================================
# TORQUE 360 Web — Multi-stage Docker Build
# Next.js Frontend (Standalone Output)
# ============================================

# --- Stage 1: Dependencies ---
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./

# Copy package.json files for dependency resolution
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/blockchain-interfaces/package.json packages/blockchain-interfaces/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# --- Stage 2: Builder ---
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY apps/web/ apps/web/
COPY packages/shared/ packages/shared/
COPY packages/blockchain-interfaces/ packages/blockchain-interfaces/
COPY pnpm-workspace.yaml package.json ./

# Build shared packages
WORKDIR /app/packages/shared
RUN pnpm build || true

# Build Next.js app
WORKDIR /app/apps/web

# Build arguments for environment variables needed at build time
ARG API_URL=http://localhost:3001
ENV API_URL=${API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# --- Stage 3: Runner ---
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat curl

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 torque && \
    adduser --system --uid 1001 torque

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Switch to non-root user
USER torque

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
