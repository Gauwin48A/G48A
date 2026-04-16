# MHub Android — Play Store Release Readiness

## Phase 6 Checklist

### Signing & Build

- [ ] Upload keystore generated (`keytool -genkey`)
- [ ] Enrolled in Google Play App Signing
- [ ] Release AAB generated: `./gradlew bundleProdRelease`
- [ ] AAB verified with `bundletool validate`
- [ ] ProGuard/R8 mapping file archived with build

### App Content Declarations

- [ ] App category: Shopping
- [ ] Content rating questionnaire completed
- [ ] Target audience declared (13+)
- [ ] Ads declaration (none / contains ads)
- [ ] COVID-19 app declaration (N/A)

### Data Safety

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Name | Yes | No | Account |
| Email | Yes | No | Account, Communication |
| Phone | Yes | No | Account, Verification |
| Location (approximate) | Yes | No | Listing proximity |
| Location (precise) | Yes | No | Nearby posts |
| Photos | Yes | Yes (listing images) | Listing creation |
| Device identifiers | Yes | No | Fraud prevention, analytics |
| Crash logs | Yes | Yes (Firebase) | Stability |
| App interactions | Yes | Yes (Firebase) | Analytics |

- [ ] Data safety form completed in Play Console
- [ ] Privacy policy URL published and linked
- [ ] Data deletion request mechanism documented

### Store Listing Assets

- [ ] App icon: 512x512 PNG
- [ ] Feature graphic: 1024x500 PNG
- [ ] Phone screenshots: min 2, recommended 8 (1080x1920)
- [ ] Tablet screenshots: min 2 for 7" and 10"
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)
- [ ] Promo video (optional, YouTube)
- [ ] App title matches brand ("MHub")

### Testing

- [ ] Internal testing track published
- [ ] Closed testing with 20+ testers
- [ ] Pre-launch report reviewed (no blockers)
- [ ] Crash-free sessions ≥ 99.5%
- [ ] ANR rate < 0.47% (Play bad-behavior threshold)
- [ ] Crash rate < 1.09% (Play bad-behavior threshold)

### Staged Rollout Strategy

| Stage | % Users | Duration | Gate |
|-------|---------|----------|------|
| Internal | Team only | 3 days | No crashers |
| Closed Alpha | 50 testers | 5 days | <0.5% crash rate |
| Open Beta | Unlimited | 7 days | Pre-launch report clean |
| Prod: 5% | 5% | 2 days | Crash-free ≥ 99.5% |
| Prod: 25% | 25% | 2 days | No regressions |
| Prod: 50% | 50% | 2 days | Stable vitals |
| Prod: 100% | 100% | — | All gates passed |

### Rollback Plan

1. **Detect**: Crashlytics alert > 1% crash rate or ANR > 0.5%
2. **Halt**: Pause staged rollout in Play Console
3. **Diagnose**: Review crash stacks, identify root cause
4. **Hotfix**: If fix is <24h, push hotfix AAB with incremented `versionCode`
5. **Rollback**: If fix is >24h, revert to previous release in Play Console
6. **Communicate**: Notify internal stakeholders via Slack

### On-Call Escalation

| Severity | Response Time | Owner |
|----------|---------------|-------|
| P0 (app crash at login) | 15 min | On-call engineer |
| P1 (feature broken) | 1 hour | Feature team lead |
| P2 (visual bug) | Next business day | Mobile team |
| P3 (enhancement) | Sprint planning | Product manager |

### Release Runbook

1. Merge release branch to `main`
2. CI builds `bundleProdRelease` AAB
3. Download AAB from CI artifacts
4. Upload to Play Console → Production track
5. Set staged rollout percentage
6. Monitor Crashlytics + Play Console vitals for 48h
7. Advance rollout if gates pass
8. Tag release in git: `v1.x.x`
