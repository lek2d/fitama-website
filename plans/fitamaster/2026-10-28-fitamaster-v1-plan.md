# Fitamaster v1 Implementation Plan

> **For agentic workers:** Implement independent backend/frontend tasks with focused subagents, followed by independent review and local integration verification.

**Goal:** Owner-only 2FA support portal at /fitamaster with player lookup, minimal shared diagnostics and action history.
**Architecture:** Existing static GitHub Pages frontend talks only to guarded Supabase RPCs. Private schema holds singleton owner access, report text, rate counters and append-only audit. No browser secret or native app change.
**Tech Stack:** HTML/CSS/ES modules, pinned Supabase JS, PostgreSQL17; Node behavioral tests and browser checks.
**Spec:** plans/fitamaster/2026-10-28-fitamaster-v1-design.md

## Global Constraints
Owner-only + mandatory TOTP; every read authorized; no rewards/ban/delete; no raw health/save/auth fields; no formula copy; no uncommitted work overwritten; no live mutations before reviewed deployment package.

## Review Focus
Non-admin or aal1 directly calling RPC; stale/revoked sessions or MFA; report XSS/credentials/oversize/retry conflict; stale async responses after signout/player change; truthful null/source/timestamp states and no mutation by player reads.

### Task 1: Guarded database API
Files: app repo supabase/migrations/202610280002_fitamaster_owner_portal.sql, supabase/tests/fitamaster-owner-portal.test.mjs, docs/operations/2026-10-28-fitamaster.md.
- [x] Write failing synthetic PostgreSQL integration tests for authorization bypasses, pagination, fields, log attribution, report validation/deduplication/expiry.
- [x] Implement exact API contract; narrowly grant RPCs only to authenticated; no direct table grants even service_role; explicit fixed search_path.
- [x] Run real local Postgres tests, no skips; record RED/GREEN and no existing gameplay schema data changes.
- [x] Independent security review and fixes.

### Task 2: Owner auth and support interface
Files: website docs/fitamaster/*, tools/build-fitamaster.mjs, tests/fitamaster*.test.mjs, package files if needed.
- [x] Write behavioral tests for auth gating, session loss, stale requests, diagnostics limits and safe rendering.
- [x] Implement login/password+email link, TOTP enroll/challenge, session-only storage; block all data before backend aal2 permission. October 28 follow-up: browser email links work across tabs/browsers using validated fragment sessions; legacy PKCE requires its original verifier.
- [x] Implement real API-backed player table/detail, diagnostic import/view/review, history paging, errors/empty states; no fake production data.
- [x] Bundle dependency locally; add strict meta CSP/noindex/referrer policy; preserve existing pages/art.
- [x] Run existing website tests plus new tests and desktop/mobile synthetic browser flows.

### Task 3: Integration and deployment readiness
- [x] Reconcile frontend/SQL payloads; independently review whole change.
- [x] Verify public bundle contains no privileged keys, storage and cache behavior; run detector once and browser batch at1440/390/320.
- [ ] Prepare additive migration/rollback and exactly-one-owner bootstrap by confirmed identity, no secrets in outputs. Check production schema compatibility metadata.
- [ ] Publish/deploy only with required confirmed owner identity and concrete package; verify live non-admin denial, then owner completes private MFA itself. Report actual boundaries.

## Verified local result
Backend commit27140e3:19/19 focused tests with cumulative install/RESTRICT rollback preservation. Actual local PostgreSQL18.6; production17 execution not claimed. Website final115/115 (27portal+88existing),0skipped. Synthetic browser9checks pass at1440/390/320 with no console errors; real owner/provider flow remains unverified. Independent reviews fixed Auth lock inversion, expiry JSON-null boundary, retryable verification errors and unsent-draft loss. Scoped callback review found no auth weakening. Internal plans moved outside published docs root.

No source push, live migration, owner bootstrap, Auth configuration, player-record read, native build or automation changes. Exact-owner lookup via saved CLI login requires pending explicit credential approval. Empty public key keeps the portal closed until reviewed activation.
