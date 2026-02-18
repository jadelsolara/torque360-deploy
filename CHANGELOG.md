# Changelog

All notable changes to TORQUE 360 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for v0.3.0
- Stripe + MercadoPago billing integration
- Dark mode toggle
- i18n framework (es-CL, es-MX, en-US)
- Sentry error tracking
- Onboarding wizard

## [0.2.0] - 2026-02-18

### Added
- **Bug Reporter module**: full backend API (entity, migration, DTOs, service, controller) with SHA-256 deduplication, role-based access (OPERATOR/MANAGER/ADMIN), and stats endpoint
- **Bug Reporter bridge**: client component connecting vanilla JS widget to authenticated API with Bearer token
- **Husky + lint-staged + commitlint**: automated code standards enforcement on every commit
- **Test suite**: 19 suites, 265 tests covering services, controllers, and utilities
- **Coverage for critical services**: auth, work-orders, clients, vehicles, inventory, quotations, suppliers, dashboard, audit, payroll, bugs
- **Error boundaries**: global `error.tsx`, `not-found.tsx`, and `loading.tsx` for Next.js app
- **Structured logging**: Pino with JSON output and X-Request-ID correlation
- **Order number per tenant**: `tenant_sequences` table with atomic increment
- **WebSocket auth**: JWT verification on Socket.io handshake
- **Coverage threshold**: 40% minimum enforced in Jest config

### Changed
- Auth tokens migrated from localStorage to in-memory module variable (XSS-safe)

## [0.1.1] - 2026-02-18

### Fixed
- **SQL injection**: parameterized backup SQL queries
- **Hardcoded credentials**: removed default fallbacks for JWT_SECRET and DB passwords
- **Race condition**: added advisory lock to ledger hash-chain operations
- **Data integrity**: wrapped multi-write operations in `dataSource.transaction()`
- **SII module**: removed obsolete TODOs and fixed regex escapes

### Added
- **Auth refresh tokens**: rotation with DB validation and httpOnly cookies
- **Backup**: real `pg_dump` with gzip compression and SHA-256 checksum verification
- **ESLint 10 + Prettier**: monorepo-wide flat config
- **README**: comprehensive docs with setup, scripts, and auth flow
- **Rate limiting**: ThrottlerGuard as global APP_GUARD with short/medium/long tiers
- **CSP nonce-based**: replaced unsafe-inline/unsafe-eval with per-request nonces

## [0.1.0] - 2026-02-15

### Added
- Initial monorepo structure (pnpm workspaces + Turborepo)
- **API** (NestJS): auth, tenants, users, vehicles, clients, work-orders, quotations, inventory, audit, dashboard, approvals, WMS, companies, suppliers, imports, traceability, automation, command-center, facturacion (SII), sales-pipeline, RRHH, external-portal, customer-portal, onboarding, reports, backup, health, company360, network, billing
- **Web** (Next.js 15): app router, Tailwind CSS, dashboard layout, auth flows
- **Infrastructure**: Redis, Elasticsearch, BullMQ queues, WebSocket gateway, mail (nodemailer), PDF generation (jsPDF), S3 storage
- **Database**: PostgreSQL with TypeORM, 6 migrations
- **Deployment**: Docker Compose, multi-stage Dockerfiles, staging/production deploy scripts
- **Bug reporter widget**: vanilla JS, zero dependencies, keyboard shortcut activation

[Unreleased]: https://github.com/torque360/torque360/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/torque360/torque360/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/torque360/torque360/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/torque360/torque360/releases/tag/v0.1.0
