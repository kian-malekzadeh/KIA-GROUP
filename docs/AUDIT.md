# Production Readiness Audit — Phase 0

Full-repository audit (architecture, security, data integrity, payments, exams,
challenges, admin, frontend). Findings are classified by severity and fixed in
phases (see the master hardening plan). This document is updated as items land.

Severity: **P0** critical (security / data loss / financial integrity) ·
**P1** high (production blocker) · **P2** medium · **P3** low.

## Confirmed findings

### Authentication & sessions
| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| AUTH-1 | P0 | `JwtStrategy.validateUser` and `validateRefreshToken` never check `user.status`; a suspended/banned user keeps API access until the access token (≤15 min) expires | **fixed (Phase 1)** |
| AUTH-2 | P0 | `login` and `verifyOtp` do not reject suspended/banned accounts — a banned user can mint fresh sessions | **fixed (Phase 1)** |
| AUTH-3 | P0 | Admin role change does not revoke the target user's refresh tokens — old sessions keep a changed role's refresh path alive | **fixed (Phase 1)** |
| AUTH-4 | P1 | No password reset / forgot-password flow; no change-password endpoint (email+password accounts cannot recover) | **fixed** — `POST /api/auth/forgot-password` (uniform response, email-bomb cap), `POST /api/auth/reset-password` (hashed single-use 30-min tokens, atomic claim, full session revocation), `POST /api/auth/change-password` (current-password check, other-device revocation); Persian-first reset email template; unit + runtime smoke coverage |
| AUTH-5 | P1 | No 2FA/MFA for admin accounts | **fixed** — RFC 6238 TOTP (SHA-1/6-digit/30s, ±1 step drift, replay-protected via verified-at watermark) implemented in-repo with RFC 4648 base32 + AES-256-GCM secret encryption (key derived from JWT_REFRESH_SECRET); staff-only enrollment (setup/confirm/status/recovery-codes/disable), 8 single-use bcrypt-hashed recovery codes with atomic claims, login returns a 2-minute single-purpose challenge JWT instead of a session, `POST /auth/2fa/verify` mints the real session; SUPER_ADMIN emergency-disable with audit log; unit tests incl. RFC test vectors + runtime smoke of the full lifecycle |
| AUTH-6 | P2 | `register` returns `ConflictException('Email already registered')` → account enumeration | **fixed** — registration now relies on the P2002 unique violation with a generic `409 Unable to complete registration` (message identical either way); a `bcrypt.compare` against a module-level dummy digest absorbs the timing side-channel, and a silent verification link goes to the true owner. Companion email-verification: `issueEmailVerificationLink` reuses the hashed single-use PasswordResetToken infra (`type=verify` on the reset link flips `emailVerified` without touching reset semantics); `completeProfile` email conflicts resolve through P2002 instead of a revealing lookup; `emailVerified` resets on every email change |

Positives already present: refresh tokens stored as SHA-256 digests, rotation via
delete-claim (reuse rejected), HttpOnly SameSite refresh cookie, per-phone OTP
flood caps, bcrypt cost 12, throttled auth endpoints.

### Payments
| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| PAY-1 | P0 | `completePayment` transition guard is `status: { not: 'COMPLETED' }` → `FAILED→COMPLETED` and `REFUNDED→COMPLETED` are accepted, violating the payment state machine | **fixed (Phase 3)** |
| PAY-2 | P0 | No webhook event idempotency table — Stripe replays rely solely on payment status | **fixed (Phase 3)** |
| PAY-3 | P1 | `PaymentStatus` enum lacks `CANCELLED`/`PROCESSING`; refund flows cannot be modelled properly | **fixed** — enum added (Phase 3); admin refund implemented as `POST /admin/payments/:id/refund` (full or partial, required audit reason, wallet CREDIT ledger entry, order void, concurrency-safe status claim, all in one transaction) |
| PAY-4 | P1 | Side effects (entitlements, invoice) run outside a DB transaction; email failure cannot rollback payment (good) but entitlement+order+invoice are not atomic | **fixed (Phase 3)** — completion claim + order PAID + invoice + entitlements now commit in one transaction; email/cart outside |
| PAY-5 | P2 | Client verify callback and webhook both call complete — protected by single-winner claim (good) but no outbox | accepted — atomic single-winner claim + `PaymentWebhookEvent` idempotency table cover exactly-once for the current single-instance deployment; a transactional outbox only pays off with multi-writer fan-out, revisit when scaling horizontally |

### Exams
| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| EXAM-1 | P0 | `submitExam` accepts submissions after `endsAt` (no expiration check on the submit path) | **fixed (Phase 5)** — server-authoritative: `endsAt < now` expires the attempt and rejects the submission; verified on both readiness and course exams |
| EXAM-2 | P0 | No DB constraint enforcing one active attempt per user/exam — race can create parallel attempts | **fixed (Phase 5)** — partial unique indexes (`status IN (IN_PROGRESS, PROCESSING)`) + atomic IN_PROGRESS→PROCESSING claim; app handles the P2002 race by returning the existing attempt |
| EXAM-3 | P1 | Exam questions stored as JSON strings without version pinning on the attempt | **fixed** — both attempt models carry a `questionSnapshot` (migration `20260926120000`); course-exam and readiness attempts pin the full question set at start, serve/grade from the pinned snapshot, and only legacy rows (null snapshot) fall back to the live payload/bank; covered by unit specs on both services |
| EXAM-4 | P1 | `CourseExamAttempt` allows unlimited attempts with no constraint | **fixed** — `CourseExam.maxAttempts` column (default 3, admin-tunable 1–10, migration `20260928100000`); `startAttempt` counts only SUBMITTED attempts against the cap and returns 403 with a localized count when exhausted; EXPIRED/PROCESSING attempts are terminal (no longer resumable, fixing the pre-existing expired-attempt-restart quirk) and never consume budget; 5 unit specs |

### Challenges
| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| CHAL-1 | P0 | Submissions carry no `challengeId`; leaderboard points/rank updated non-atomically and overwritten rather than accumulated | fixed (Phase 6) |
| CHAL-2 | P0 | No rate limit on submission endpoint; no sandboxed execution model (scoring is heuristic/static — no user code executes server-side, which limits blast radius but the architecture must stay explicit) | fixed (rate limit) / sandbox backlog |
| CHAL-3 | P1 | ~~`Challenge` model exists but is unused by the submission flow~~ | **fixed** — `CreateChallengeSubmissionDto.challengeId` (id or slug) is resolved server-side to the `Challenge` row (FK-enforced), open-window validated, and its `version` pinned on the submission; `challengeId`/`challengeVersion` are exposed on every submission response |

### Database
| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| DB-1 | P0 | `WalletTransaction.paymentId` has no FK; wallet balance is a bare mutable `Int` with no ledger invariant | fixed (FK + invariant) — `LearnerWallet_balanceCents_nonnegative` CHECK constraint (migration `20260902210002`); every balance mutation runs inside a DB transaction with its ledger row (payment completion DEBIT, refund CREDIT, admin adjust with balance check) |
| DB-2 | P1 | Stringly-typed states (`ExamAttempt.status`, `Order.source`, `User.status`, `Entitlement.resourceType`) — validated only in app code | **fixed** — new `UserStatus` / `OrderSource` / `EntitlementResourceType` Postgres enums with data remap in migration 20260906140000 (`ExamAttempt.status` and `Order.status` were already enums); admin grant API now normalizes legacy `readiness_test`/`roadmap_bundle` labels to the canonical learner vocabulary, fixing a latent grant→check mismatch | 
| DB-3 | P1 | JSON payloads persisted as `String` (answers, questions, modules, pricing, invoice line items) | **fixed** — all 14 flagged columns (Assessment.answers, Roadmap.modules/profile/pricing, ReadinessTest.scores/percentages/verdict, PersonalityResult.answers/scores, ChallengeSubmission.result, Payment.metadata, PaymentWebhookEvent.payload, Invoice.lineItems, ExamAttempt.questionIds/answers/domainScores/percentages/outcome/verdict, CourseExam.questions, CourseExamAttempt.answers, TestBank.payload, SiteSetting.value) converted to `jsonb` via Prisma `Json`; ~40 service-layer parse/stringify round-trips removed and services now read/write native JSON | 
| DB-4 | P2 | No soft-delete strategy for financial/audit records | **fixed** — `User.deletedAt` soft-delete column; `Order→User`, `Payment→User`, `Invoice→Order` FKs changed Cascade→Restrict so financial records can never vanish via a user deletion; SUPER_ADMIN-only `DELETE /admin/users/:id` (PII-minimizing anonymization + force logout + audit) and `POST /admin/users/:id/restore`, with regression tests; soft-deleted users hidden from admin lists and locked out of auth |

### Admin & authorization
| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| ADM-1 | P1 | Permission matrix duplicated frontend/backend; frontend must only consume server-issued access | **fixed** — unified `resolveStaffAdminAccess` (shared): per-user override → custom role matrix → site template. Backend issues the resolved matrix on `AuthUser.adminPanelAccess` (`buildAuthUser` + `ModeratorAccessService` now share one code path); custom roles without a matrix previously resolved to the client default instead of the site template — fixed. Admin UI (`useAdminAccess`) consumes the issued matrix verbatim, no local derivation; staff gates (`isStaffRole`) unified across admin shell, login redirect, post-login path, TopBar, and 2FA page so custom roles reach the panel. Demo mode adds a moderator persona with an explicitly issued matrix |
| ADM-2 | P1 | Object-level authorization (IDOR) not systematically audited across controllers | **swept** — every object-level route audited (orders, payments, invoices, cart items, todos, tickets, messages, readiness/course-exam attempts, roadmaps, assessments, challenges, competitions, media); all learner routes scope by `userId` or enforce enrollment/entitlement; admin routes SUPER_ADMIN-gated for role/access changes with last-super protection. **One gap found & fixed:** unauthenticated gateway success callbacks required no `authority` proof (dev provider verifies everything as success) — the fail-closed gate now covers success AND failure callbacks; GET callback gained IDPay `id`/`order_id` mapping |

| ADM-2b | P1 | Public payment callback success path could be forged without the provider-issued authority (dev provider verified everything as success) | **fixed** — `verifyGatewayCallback(null, …)` now requires `dto.authority === payment.gatewayRef` before any provider verify, on both success and failure callbacks; the dev provider still verifies as success, which is exactly why the authority proof gates *before* the provider |
| ADM-3 | P2 | Admin audit log exists (AdminAuditLog) — coverage of all sensitive actions needs completion | **fixed** — coverage sweep of all 33 admin mutation routes against audit.record calls found one gap (`contact.read`); `markContactMessageRead` now records a `contact.read` entry with before/after readAt and request meta. All admin mutations are audited |

### Infrastructure / CI
| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| CI-1 | P2 | No dependency/secret/security scan in CI; `pnpm audit` absent | **fixed** — `.github/workflows/security.yml`: `pnpm audit --prod --audit-level=high`, gitleaks full-history secret scan, CodeQL JS/TS analysis; all actions SHA-pinned |
| CI-2 | P2 | Throttler is in-memory — fine single-instance; distributed limiting needs Redis at scale | **fixed** — `RateLimitStorageProvider` uses Redis when `REDIS_URL` is set, fail-open to in-memory on connection failure (spec-covered) |
| CI-3 | P3 | Demo mode (`NEXT_PUBLIC_DEMO_MODE`) is explicit and cannot silently enable — acceptable | verified |

### Frontend
| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| FE-1 | P2 | Access token in `sessionStorage` (not localStorage) — acceptable; move to HttpOnly cookie pattern long-term | accepted — per-tab sessionStorage scoping is a deliberate XSS blast-radius trade-off; refresh lives in an HttpOnly cookie already, so the 15-min access token in sessionStorage is tolerable; revisit only with a dedicated security pass |
| FE-2 | P2 | `LessonPlayer` uses `dangerouslySetInnerHTML` — sanitize audit pending | **fixed (audit complete)** — the only other sink (layout JSON-LD) already neutralizes `<` (\u003c). `markdownToHtml` verified escape-first across all block types (fenced code, headings, lists, blockquotes, paragraphs, inline code/bold/italic/links); link hrefs restricted to `http(s)`/site-relative (no `javascript:`/`data:`); emitted tag vocabulary pinned to the 14 known tags by a new test suite (script/iframe/object/embed/style/onerror injection, href smuggling, attribute breakout) — no sanitizer needed, escaping is airtight |
| FE-3 | P3 | `markdown.ts` escapes all input before tag emission — verified safe pattern | verified |

## Phase order

Phase 1 auth/session revocation → Phase 3 payment state machine & webhook
idempotency → Phase 5 exam integrity → Phase 6 challenge integrity →
Phase 4 database integrity → then P1 phases per the master plan.

## Session 2026-10-06 — master re-audit

Full re-verification of every claim above against the code (not the docs),
baseline → fix → re-verify cycle. Baseline at session start: `pnpm lint` ✅ ·
`pnpm typecheck` ✅ · `pnpm test` 361 ✅ · `pnpm build` ✅ · `pnpm test:e2e`
**5/9 failed (pre-existing)** · `pnpm audit --prod` **2 vulnerabilities
(1 critical + 1 high) — pre-existing**.

| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| DEP-3 | P0 | `proxy-addr <2.0.8` (critical, IPv4-mapped-IPv6 trust-subnet IP spoofing) newly reachable in the prod tree via `@nest-lab/throttler-storage-redis → @nestjs/core → platform-express → express`; the API sets `trust proxy` when `TRUST_PROXY=true`, so `req.ip`/rate-limit keys could be spoofed behind a proxy | **fixed** — workspace override `proxy-addr: '>=2.0.8'` in `pnpm-workspace.yaml` (same convention as the 17 overrides from 2026-09-29); `pnpm audit --prod --audit-level=high` → 0 |
| DEP-4 | P1 | `source-map-js <1.2.2` (high, event-loop DoS via indexed source-map offsets) newly reachable in the prod tree via `@prisma/client → prisma → … → magicast` and `next → postcss` | **fixed** — workspace override `source-map-js: '>=1.2.2'`; audit clean |
| EVT-1 | P2 | `CompetitionsService.register` did find-then-create with no P2002 handling: two concurrent registrations both passed the pre-check and the DB unique constraint turned the loser into a raw Prisma error (HTTP 500) instead of the intended 409; the domain event could also announce a registration that never persisted | **fixed** — the `userId+competitionId` unique constraint is now the authoritative single-winner: P2002 → `ConflictException('Already registered')`, loser publishes no event; regression suite `competitions.service.spec.ts` (6 specs: happy path, 404 inactive/unknown, ended, duplicate, **race**, non-P2002 rethrow) |
| QA-2 | P2 | `e2e/learner-journey.spec.ts` asserted the **pre-rebuild** landing (`Learning path` / `Material Studio` CTAs, email-signup `/register`) — 5/9 E2E failures were stale expectations against the approved UX-10/UX-12/AUTH-6 design, not UI bugs | **fixed** — spec updated to pin the approved UI: tagline hero, `Sign in / Sign up` → `/education`, email door → `/login`, `/register` → phone-only OTP redirect, fa/ع RTL, cookie locale persistence, 400px compact CTAs; UI untouched (UI freeze respected). E2E now **9/9 green** |
| DOC-4 | P3 | `AGENTS.md` route table described `/` as “Material + Education CTAs” — stale since the minimal-guest-landing change | **fixed** — row now reflects the actual auth-only landing |

Re-verified in this session (evidence, not docs): OTP hashing/expiry/single-use
attempt-caps + phone flood windows + masked logging; refresh rotation via atomic
digest-claim delete; HttpOnly/Secure/SameSite cookie; suspended-user rejection on
every request; 2FA challenge flow; payment state machine + atomic single-winner
completion claim + `PaymentWebhookEvent` idempotency + authority-proof public
callbacks; Zarinpal server-side verify (100/101), simulator blocked in production;
media signed-token + `resolveUnderRoot` path-traversal guards; avatar magic-byte
sniffing; admin `AdminAccess` guards + audit records; demo mode gated
(`isDemoMode` requires explicit `NEXT_PUBLIC_DEMO_MODE=true` and loses to any
`NEXT_PUBLIC_API_URL`); 44 models / 19 migrations applied cleanly to a fresh
Postgres 16; seed OK; `pnpm audit --prod` 0 vulnerabilities.

**Final gates (2026-10-06):** lint ✅ · typecheck ✅ · test **367/367** ✅ ·
build (357 static pages) ✅ · **E2E 9/9 ✅** · audit 0 vulns ✅ ·
gitleaks/CodeQL run in `security.yml` (CI-side; gitleaks not installed locally).
No known regressions: baseline failures all FIXED (e2e 5→0, audit 2→0).
