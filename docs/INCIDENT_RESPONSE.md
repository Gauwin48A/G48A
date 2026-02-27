# Incident Response Runbook

Last updated: 2026-02-27
Owners: Engineering + On-call
Security policy: `server/docs/security-policy.md`
Monitoring/alert ownership matrix: `server/docs/MONITORING_ALERTING_OWNERSHIP.md`

## 0. Ownership and On-call

Primary incident commander role: On-call Rotation Lead
Primary technical responder role: service owner from the ownership matrix
Escalation owner: Engineering Manager (if unresolved beyond SLA)

## 1. Severity Levels

### P1 (Critical)
- Service outage, security breach, data-loss risk.
- Response target: acknowledge in 5 minutes.
- Escalation: on-call engineer + tech lead immediately.

### P2 (High)
- Major feature broken, severe latency, partial outage.
- Response target: acknowledge in 15 minutes.
- Escalation: on-call engineer; lead if unresolved in 30 minutes.

### P3 (Medium)
- Non-critical feature regression with workaround.
- Response target: acknowledge in 60 minutes.

## 2. Immediate Actions (First 10 Minutes)
1. Confirm incident scope and severity.
2. Create incident channel and assign incident commander.
3. Capture current deploy version and recent changes.
4. Check health endpoints:
   - `GET /health`
   - `GET /api/health`
5. Stabilize first:
   - Roll back recent deploy if blast radius is high.
   - Toggle off risky feature flags if available.

## 3. Diagnostic Checklist

### API/Server
1. Check process health and restart loops.
2. Check error logs for spikes (5xx, auth failures, DB timeouts).
3. Verify JWT and refresh-token related errors.

### Database
1. Check connection pool saturation.
2. Check slow queries and lock contention.
3. Verify replication/failover status (if enabled).

### Realtime (Socket/Notifications)
1. Verify socket connectivity and CORS errors.
2. Verify message queue/backlog for notifications.

### Frontend
1. Verify login flow and protected-route behavior.
2. Verify API base URL/env configuration.
3. Check browser console for runtime exceptions.

## 4. Common Playbooks

### Database connection exhaustion
1. Identify long-idle or blocked connections.
2. Free stale sessions.
3. Restart API if connection pool does not recover.
4. Add short-term traffic protection (rate limiting).

### Token/session failures
1. Confirm auth secrets are correct in runtime env.
2. Verify refresh endpoint behavior.
3. Invalidate broken sessions only if required.

### Deployment regression
1. Roll back to previous known-good release.
2. Verify key user flows:
   - Login
   - Feed/all-posts load
   - Post creation
3. Start root-cause analysis after stabilization.

## 5. Communication Template

### Internal update
- What happened:
- User impact:
- Current status:
- Mitigation in progress:
- Next update time:

### External/status page
- Incident started at:
- Affected services:
- Current state:
- Workaround (if any):
- Next update ETA:

## 6. Recovery and Closeout
1. Confirm metrics return to baseline for at least 30 minutes.
2. Verify no data integrity gaps remain.
3. Close incident channel with final summary.
4. Open postmortem action items with owners and due dates.

## 7. Postmortem Minimum Fields
1. Timeline (UTC and local time).
2. Root cause.
3. Detection gap.
4. Why safeguards failed.
5. Permanent fixes and deadlines.
