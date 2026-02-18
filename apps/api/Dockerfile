# ============================================
# TORQUE 360 API — Multi-stage Docker Build
# NestJS Backend
# ============================================

# --- Stage 1: Builder ---
FROM node:25-alpine AS builder

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./

# Copy package.json files for dependency resolution
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/blockchain-interfaces/package.json packages/blockchain-interfaces/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY apps/api/ apps/api/
COPY packages/shared/ packages/shared/
COPY packages/blockchain-interfaces/ packages/blockchain-interfaces/

# Build shared packages first
WORKDIR /app/packages/shared
RUN pnpm build || true

WORKDIR /app/packages/blockchain-interfaces
RUN pnpm build || true

# Build the API
WORKDIR /app/apps/api
RUN pnpm build

# --- Stage 2: Runner ---
FROM node:25-alpine AS runner

RUN apk add --no-cache libc6-compat curl wget

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 torque && \
    adduser --system --uid 1001 torque

# Copy built output
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER torque

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --spider -q http://localhost:3001/api/health || exit 1

CMD ["node", "dist/main.js"]
