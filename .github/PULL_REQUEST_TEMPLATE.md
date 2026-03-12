## Summary

- What changed:
- Why it changed:
- Scope boundary:

## Zero-INR / Non-AI Compliance

- [ ] No AI/ML/LLM/vector/inference feature introduced.
- [ ] No mandatory paid dependency introduced.
- [ ] No new always-on infra/service required.
- [ ] Change remains compatible with Cloudflare Free tier baseline.

## Quality Checklist

- [ ] `npm run doctor` passes.
- [ ] `npm --prefix client run lint` passes.
- [ ] `npm --prefix client run test` passes.
- [ ] `npm --prefix server test` passes.
- [ ] `npm --prefix client run build` passes.

## Contract And Regression Checklist

- [ ] API contracts validated if backend surface changed.
- [ ] Route/navigation contract validated if frontend routing changed.
- [ ] Added or updated tests for changed behavior.
- [ ] Added rollback-safe behavior for risky changes.

## Documentation Checklist

- [ ] `README.md` updated for behavior/command/config changes.
- [ ] New scripts or env variables documented.
- [ ] Runbook note added for operationally relevant changes.

## Screenshots

Provide before/after or current-state screenshots for UI-impacting changes.

## KPI / Outcome

- Primary KPI:
- Baseline:
- Expected movement:

## Risk And Rollback

- Risk level: Low / Medium / High
- Rollback path:
