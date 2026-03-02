# Master Fix Prompt

Use this prompt with Codex/ChatGPT to fix critical production gaps end-to-end:

```text
You are working in the MHub monorepo. Fix all critical reliability/security/operations gaps and implement changes directly in code.

Goals:
1) Startup safety:
- Remove unsafe blind process killing.
- Prevent infinite restart loops with bounded restart policy and backoff.
- Only allow force-kill of app-owned listeners via explicit env flag.

2) Database hardening:
- Remove insecure production defaults.
- Enforce required DB env vars in production.
- Enforce TLS settings with rejectUnauthorized=true by default in production.

3) Runtime readiness hardening:
- In production, Redis/session/cache memory fallback must fail readiness unless explicitly allowed.
- Return HTTP 503 for degraded readiness in production.
- Keep dev behavior practical.

4) Operational endpoint hardening:
- Protect /api/test-notification behind auth + admin role.
- Disable this endpoint by default in production via env flag.

5) Background jobs control:
- Respect DISABLE_BACKGROUND_JOBS=true for CI/test and startup.
- Ensure all scheduled/background jobs honor the toggle.

6) Ops gates in workflow:
- Add an operations gate script that checks failover dependency posture and backup evidence freshness.
- Wire it into release gate as strict.
- Add CI visibility step (non-strict advisory) for the same gate.

7) Validation:
- Run syntax checks for changed files.
- Run doctor and runtime smoke checks.
- Provide a final report with:
  - files changed
  - commands run
  - pass/fail results
  - remaining risks

Constraints:
- Do not revert unrelated existing user changes.
- Keep changes minimal, auditable, and production-safe.
- Prefer explicit env flags for strict behaviors.
```

