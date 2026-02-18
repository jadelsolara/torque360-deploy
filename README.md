# TORQUE 360

ERP SaaS for the automotive workshop industry in Chile and LATAM. Multi-tenant, cloud-native, API-first.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Backend | NestJS 11, TypeORM 0.3, PostgreSQL 17 |
| Search | Meilisearch |
| Cache / Queues | Redis 7, BullMQ |
| Real-time | Socket.io (WebSockets) |
| Auth | JWT (httpOnly cookies), bcrypt, Passport |
| Storage | Cloudflare R2 (S3-compatible) |
| Invoicing | SII Chile electronic invoicing |
| PDF | PDFKit |
| Email | Nodemailer (ProtonMail Bridge) |
| Proxy | Nginx (reverse proxy, TLS termination) |
| Infra | Docker Compose, Turborepo monorepo |
| Package Manager | pnpm 9+ |
| Node | 22+ |

## Project Structure

```
torque360/
  apps/
    api/            NestJS backend (port 3001)
    web/            Next.js frontend (port 3000)
    iq/             Analytics / Intelligence app
  packages/
    shared/         Shared types and utilities
    blockchain-interfaces/
  deploy/
    nginx/          Reverse proxy config
    scripts/        deploy.sh, backup.sh
```

### API Modules

auth, work-orders, inventory, facturacion (SII), clients, vehicles, suppliers, rrhh (payroll), dashboard, wms (warehousing), quotations, imports, reports, audit, network (B2B marketplace), backup, tenants, companies, external-portal, health.

## Prerequisites

- **Node.js** >= 22
- **pnpm** >= 9 (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- **Docker** & **Docker Compose** (for PostgreSQL, Redis, Meilisearch)

## Setup

```bash
# 1. Clone and install
git clone <repo-url> && cd torque360
pnpm install

# 2. Start infrastructure
docker compose up -d
# Starts: PostgreSQL 17 (5432), Redis 7 (6379), Meilisearch (7700)

# 3. Configure environment
cp .env.example .env
# Edit .env — at minimum set:
#   DATABASE_PASSWORD, REDIS_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, MEILI_MASTER_KEY
# Generate secrets with: openssl rand -base64 48

# 4. Run in development (both API + Web concurrently)
pnpm dev
```

- **API:** http://localhost:3001/api
- **Swagger docs:** http://localhost:3001/api/docs
- **Web:** http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in watch mode |
| `pnpm build` | Build all apps |
| `pnpm lint` | Run ESLint across monorepo |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check formatting without writing |
| `pnpm test` | Run all test suites |
| `pnpm docker:up` | Start infrastructure services |
| `pnpm docker:down` | Stop infrastructure services |
| `pnpm docker:reset` | Destroy volumes and restart fresh |

### API-specific (run from `apps/api/`)

| Command | Description |
|---------|-------------|
| `pnpm test` | Run unit tests (Jest) |
| `pnpm test:cov` | Run tests with coverage |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm lint` | Lint API source |
| `pnpm stress` | Run k6 load tests |
| `pnpm migration:generate` | Generate TypeORM migration |
| `pnpm migration:run` | Run pending migrations |
| `pnpm migration:revert` | Revert last migration |

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key groups:

| Group | Variables |
|-------|-----------|
| Database | `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |
| Auth | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRATION` (default 15m) |
| Search | `MEILI_HOST`, `MEILI_MASTER_KEY` |
| Storage | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |
| SII | `SII_ENVIRONMENT` (sandbox/production), `SII_RUT_EMPRESA`, `SII_CERT_PATH` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` |
| Ports | `API_PORT` (3001), `WEB_PORT` (3000) |

## Auth Flow

1. **Login/Register** returns `accessToken` in response body + `refreshToken` as httpOnly cookie
2. Access token (15 min) is stored in-memory (JS variable, not localStorage)
3. On page refresh, the client calls `POST /api/auth/refresh` using the cookie to restore the session
4. Refresh tokens are SHA-256 hashed and stored in `refresh_tokens` table for revocation support
5. Token rotation: each refresh invalidates the old token and issues a new pair

## Deployment

```bash
# Staging
pnpm deploy:staging

# Production
pnpm deploy:production
```

Production Docker Compose config is at `docker-compose.prod.yml`.

## Documentation

- [SII Integration Status](docs/SII_INTEGRATION_STATUS.md) — Chile electronic invoicing implementation
- [MFA Status](docs/MFA_STATUS.md) — Multi-factor authentication assessment

## License

Proprietary. All rights reserved.
