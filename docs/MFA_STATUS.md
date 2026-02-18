# MFA Status — TORQUE 360

Last updated: 2026-02-17

## Current Auth Infrastructure

Located in: `apps/api/src/modules/auth/`

### What Exists

| Component | File | Status |
|-----------|------|--------|
| JWT access tokens | `auth.module.ts`, `auth.service.ts` | Working. Configurable secret and expiration via env vars |
| JWT refresh tokens | `auth.service.ts` `refreshToken()` | Working. 7-day expiration, validates user is still active |
| Password hashing | `auth.service.ts` | bcrypt with cost factor 12 |
| Passport JWT strategy | `jwt.strategy.ts` | Extracts Bearer token, validates payload |
| Role-based authorization | `auth.controller.ts`, guards | OWNER, ADMIN, MANAGER, OPERATOR, VIEWER roles |
| Tenant isolation | JWT payload includes `tenantId` | All queries scoped to tenant |
| User registration (tenant) | `auth.service.ts` `registerTenant()` | Creates tenant + owner user in transaction |
| User registration (invite) | `auth.service.ts` `registerUser()` | ADMIN-only, within existing tenant |
| Login with activity tracking | `auth.service.ts` `login()` | Updates `lastLogin` timestamp |
| Tenant deactivation check | `auth.service.ts` `login()` | Blocks login if tenant is inactive |

### What Is Missing (No MFA Implementation)

| Component | Priority | Details |
|-----------|----------|---------|
| TOTP setup endpoint | CRITICAL | `POST /auth/mfa/setup` — Generate secret, return QR code URI for authenticator apps (Google Authenticator, Authy) |
| TOTP verify endpoint | CRITICAL | `POST /auth/mfa/verify` — Validate 6-digit code during login |
| MFA enable/disable | HIGH | `PATCH /auth/mfa/toggle` — Allow users to enable/disable after initial setup verification |
| User entity MFA fields | CRITICAL | `mfaEnabled: boolean`, `mfaSecret: string` (encrypted), `mfaBackupCodes: string[]` columns on User entity |
| Backup/recovery codes | HIGH | Generate 8-10 one-time-use recovery codes on MFA setup |
| Login flow MFA gate | CRITICAL | After password validation, if `mfaEnabled`, return partial token requiring MFA step before issuing full JWT |
| MFA enforcement per tenant | MEDIUM | Tenant setting to require MFA for all users (especially ADMIN/OWNER roles) |
| Rate limiting on MFA verify | HIGH | Prevent brute-force of 6-digit codes (max 5 attempts, then lockout) |
| Remember device | LOW | Optional: skip MFA on trusted devices for 30 days |
| Dependencies needed | -- | `otplib` (TOTP generation/verification), `qrcode` (QR code generation) |

### Security Notes

- `refreshToken()` in `auth.service.ts` (line 144) uses `JWT_SECRET` as the verification secret instead of `JWT_REFRESH_SECRET`. This means access and refresh tokens are interchangeable — should use separate secrets.
- The fallback `'change-me-in-production'` default secret appears in 3 places (`auth.module.ts` line 20, `auth.service.ts` line 144, `jwt.strategy.ts` line 19). In production this MUST be overridden by env var.
