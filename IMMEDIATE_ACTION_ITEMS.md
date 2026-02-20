# AG>MHUB PRODUCTION LAUNCH - IMMEDIATE ACTION ITEMS

**Status**: Not Production Ready (5.2/10 maturity)
**Timeline to Launch**: 8-10 weeks with full-time team
**Most Urgent**: Week 1 items MUST start immediately

---

## WEEK 1: CRITICAL FOUNDATION (START THIS WEEK)

### ⚠️ MUST FIX BEFORE ANY PRODUCTION TRAFFIC

#### Task 1.1: Fix Socket.io Hardcoded URL (1 HOUR)
**File**: `server/src/lib/socket.js`
**Current**:
```javascript
const SOCKET_URL = 'http://localhost:5000';
```
**Fix**:
```javascript
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? 'https://api.mhub.com' : 'http://localhost:5000');
```
**Testing**: Build and verify Socket.io connects to correct URL
**Status**: [ ] COMPLETE

---

#### Task 1.2: Set Up GitHub Actions CI/CD (40 HOURS)
**Goal**: Automated tests & deployments to staging

**Step 1: Create `.github/workflows/test.yml`**
```yaml
name: Test & Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd server
          npm ci

      - name: Run linting
        run: |
          cd server
          npm run lint || true  # For now, warnings only

      - name: Run tests
        run: |
          cd server
          npm test
        env:
          DB_HOST: localhost
          DB_USER: postgres
          DB_PASSWORD: testpass
          DB_NAME: test_mhub
          NODE_ENV: test

      - name: Build frontend
        run: |
          cd client
          npm ci
          npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: frontend-build
          path: client/dist

  frontend-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd client
          npm ci

      - name: Run frontend build
        run: |
          cd client
          npm run build

      - name: Check bundle size
        run: |
          cd client
          GZIP_SIZE=$(du -sk dist/ | cut -f1)
          if [ $GZIP_SIZE -gt 200000 ]; then
            echo "WARNING: Bundle size is ${GZIP_SIZE}KB (target: <100KB gzipped)"
          fi
```

**Step 2: Test locally**
```bash
git push  # Trigger workflow
# Check GitHub Actions tab for results
```

**Status**: [ ] COMPLETE

---

#### Task 1.3: Upgrade axios (Critical Security Fix) (1 HOUR)
**Current**: axios 1.6.8 (has known CVEs)
**Fix**:
```bash
cd server
npm update axios
cd ../client
npm update axios
```
**Verify**: No security warnings in `npm audit`
**Status**: [ ] COMPLETE

---

#### Task 1.4: Implement Error Reporting with Sentry (2 DAYS)
**Backend Setup**:
```bash
npm install @sentry/node
```

**Configure** (`server/src/index.js`):
```javascript
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

app.use(Sentry.Handlers.requestHandler());
// ... routes ...
app.use(Sentry.Handlers.errorHandler());
```

**Frontend Setup** (`client/src/main.jsx`):
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});
```

**Environment Variables**:
```
SENTRY_DSN=https://xxxxx@sentry.io/123456
VITE_SENTRY_DSN=https://yyyyy@sentry.io/789012
```

**Test**:
```javascript
// Test in frontend
try {
  throw new Error("Test error");
} catch (e) {
  Sentry.captureException(e);
}
```

**Cost**: Free tier includes 5,000 errors/month
**Status**: [ ] COMPLETE

---

##### Task 1.5: Document Incident Response Procedures (8 HOURS)
**Create `docs/INCIDENT_RESPONSE.md`**:

```markdown
# Incident Response Playbook

## Severity Levels
- **P1 (Critical)**: Service down, data loss, security breach
  - Response time: <5 minutes
  - On-call notified immediately

- **P2 (High)**: Major features broken, performance degraded
  - Response time: <15 minutes

- **P3 (Medium)**: Minor features broken, workarounds exist
  - Response time: <1 hour

## Common Incidents

### Database Connection Pool Exhausted
**Symptoms**: "FATAL: sorry, too many clients already"
**Resolution**:
1. Check `/api/health` endpoint (should return DB status)
2. SSH to database server
3. Kill idle connections:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE state = 'idle' AND query_start < NOW() - '1 hour'::interval;
   ```
4. Restart API servers once connections freed
5. Monitor connection count for recurrence

### High Memory Usage
**Symptoms**: API becomes slow, crashes after 2-3 hours
**Likely Cause**: Socket.io memory leak
**Resolution**:
1. Check memory usage: `pm2 ls` (memory column)
2. If persistent: Restart services `pm2 restart all`
3. Investigate socket cleanup in `socketService.js`

### Database Replication Lag
**Symptoms**: Read replica data is stale
**Resolution**:
1. Check lag: `SELECT EXTRACT(EPOCH FROM (now() - pg_last_wal_receive_lsn())) as lag;`
2. If lag > 30 seconds: Migrate traffic to primary
3. Investigate network between primary/replica
```

**Status**: [ ] COMPLETE

---

### Week 1 Summary
**Hours**: 48-50 hours
**People**: 1 Backend Engineer + 1 DevOps Engineer

**Deliverables**:
- ✅ Socket.io fixed for production
- ✅ CI/CD pipeline automated (GitHub Actions)
- ✅ Security: axios upgraded, Sentry integrated
- ✅ Incident response procedures documented

**Go/No-Go Check**: If all complete, proceed to Week 2. If any incomplete, PAUSE and finish before production traffic.

---

## WEEK 2: MONITORING & LOGGING (SECOND PRIORITY)

### Task 2.1: Set Up Centralized Logging (30 HOURS)

**Option A: CloudWatch (Recommended for AWS)**
```javascript
// server/src/config/logger.js
const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new WinstonCloudWatch({
      logGroupName: '/aws/mhub/api',
      logStreamName: `api-${process.env.NODE_ENV}`,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY,
      awsSecretKey: process.env.AWS_SECRET_KEY,
      awsRegion: 'us-east-1',
      messageFormatter: ({ level, message, meta }) =>
        `[${level}] ${message} ${JSON.stringify(meta)}`
    })
  ]
});

module.exports = logger;
```

**Option B: ELK Stack (Open Source)**
- Install Elasticsearch, Logstash, Kibana (Docker)
- Configure log shipping from app
- Set up dashboards

**Time**: 10-20 hours depending on infrastructure

**Status**: [ ] COMPLETE

---

### Task 2.2: Configure APM (Application Performance Monitoring) (20 HOURS)

**Option: Datadog (Recommended)**
```javascript
// server/src/index.js (add at very top)
require('dd-trace').init({
  hostname: 'localhost',
  port: 8126,
  env: process.env.NODE_ENV,
  service: 'mhub-api',
  version: '1.0.0'
});

const tracer = require('dd-trace').tracer;
```

**Frontend**:
```javascript
// client/src/main.jsx
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'your-app-id',
  clientToken: 'your-client-token',
  site: 'datadoghq.com',
  service: 'mhub-web',
  env: import.meta.env.MODE,
  version: '1.0.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input',
});

datadogRum.startSessionReplayRecording();
```

**Cost**: $0-30/month for startup

**Status**: [ ] COMPLETE

---

### Task 2.3: Set Up Alerting (10 HOURS)

**Option: PagerDuty**
```
1. Create incident notification rules:
   - CPU > 80% → Page on-call engineer
   - Error rate > 1%  → Page on-call engineer
   - Response time > 2s (p99) → Slack warning
   - Database lag > 30s → Page on-call engineer

2. Configure escalation:
   - 5 min: Page primary on-call
   - 15 min: Add secondary on-call
   - 30 min: Page manager

3. Test pages with "test incident" in PagerDuty
```

**Cost**:  Free tier covers 1 user + basic rules

**Status**: [ ] COMPLETE

---

### Week 2 Summary
**Hours**: 50-65 hours
**Deliverables**:
- ✅ Centralized logging (CloudWatch or ELK)
- ✅ APM installed (Datadog or similar)
- ✅ Alert rules configured
- ✅ On-call notifications tested

---

## WEEK 3: TESTING & QUALITY ASSURANCE

### Task 3.1: Real Integration Tests (40 HOURS)

**Current problem**: Tests are mocked, not real
**Solution**: Test against actual database

**Example Payment Flow Test**:
```javascript
// server/tests/integration/payment.test.js
const request = require('supertest');
const app = require('../../src/index.js');
const pool = require('../../src/config/db.js');

describe('Payment Integration Tests', () => {

  beforeAll(async () => {
    // Create test database
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_payments AS
      SELECT * FROM payments LIMIT 0;
    `);
  });

  it('should validate payment amount', async () => {
    const token = await loginTestUser();

    const res = await request(app)
      .post('/api/payments/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plan_type: 'premium',
        transaction_id: 'TEST123456',
        amount: 1          // FRAUD: should be 999
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('amount');
  });

  it('should accept correct payment amount', async () => {
    const token = await loginTestUser();

    const res = await request(app)
      .post('/api/payments/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plan_type: 'premium',
        transaction_id: 'TEST789012',
        amount: 999        // CORRECT: premium is ₹999
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('payment_id');
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DROP TABLE IF EXISTS test_payments;');
  });
});
```

**Run tests**:
```bash
npm test -- --testPathPattern=integration
```

**Status**: [ ] COMPLETE

---

### Task 3.2: E2E Tests (30 HOURS)

**Tool**: Cypress or Playwright

**Example Chat Flow Test**:
```javascript
// client/tests/e2e/chat.cy.js
describe('Chat Real-Time', () => {

  beforeEach(() => {
    cy.login('user1@test.com', 'password123');
    cy.visit('/chat');
  });

  it('should send and receive messages', () => {
    // Open chat with user2
    cy.contains('user2').click();

    // Send message
    cy.get('[data-testid="message-input"]').type('Hello!');
    cy.get('[data-testid="send-button"]').click();

    // Verify message appears
    cy.contains('Hello!').should('be.visible');

    // Verify message has green checkmark (delivered)
    cy.get('[data-testid="message-status"]')
      .should('contain', '✓✓');
  });

  it('should handle offline messages', () => {
    // Go offline
    cy.intercept('GET', '/api/**', { forceNetworkError: true });

    // Try to send message
    cy.get('[data-testid="message-input"]').type('Offline message');
    cy.get('[data-testid="send-button"]').click();

    // Should queue message
    cy.get('[data-testid="message-status"]')
      .should('contain', 'Sending...');

    // Come back online
    cy.intercept('GET', '/api/**', {});

    // Message should send
    cy.get('[data-testid="message-status"]')
      .should('contain', '✓✓');
  });
});
```

**Run tests**:
```bash
npx cypress open
# or
npx cypress run
```

**Status**: [ ] COMPLETE

---

### Task 3.3: Load Testing (50 HOURS)

**Tool**: k6

**Create load test** (`tests/load/feed.js`):
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },     // Ramp-up to 100 users
    { duration: '5m', target: 10000 },   // Ramp-up to 10k
    { duration: '10m', target: 50000 },  // Ramp-up to 50k
    { duration: '5m', target: 100000 },  // Ramp-up to 100k
    { duration: '10m', target: 100000 }, // Stay at 100k
    { duration: '5m', target: 0 },       // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests <500ms
    http_req_failed: ['rate<0.01'],   // <1% error rate
  },
};

export default function() {
  // Realistic user flow
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.TOKEN}`
    }
  };

  // Feed request
  const feedRes = http.get(
    'https://api.mhub.com/api/posts?category=electronics&limit=10',
    params
  );

  check(feedRes, {
    'Feed status is 200': (r) => r.status === 200,
    'Response time < 500ms': (r) => r.timings.duration < 500,
    'Feed has posts': (r) => JSON.parse(r.body).posts.length > 0,
  });

  sleep(1);

  // Post detail request
  const postRes = http.get(
    'https://api.mhub.com/api/posts/12345',
    params
  );

  check(postRes, {
    'Post status is 200': (r) => r.status === 200,
    'Post has details': (r) => JSON.parse(r.body).post_id,
  });

  sleep(2);
}
```

**Run load test**:
```bash
k6 run tests/load/feed.js --vus 1000 --duration 5m
```

**Monitor results**: k6 Cloud dashboard shows breaking point

**Status**: [ ] COMPLETE

---

### Week 3 Summary
**Hours**: 120 hours
**Deliverables**:
- ✅ Real integration tests written & passing
- ✅ E2E tests for critical paths
- ✅ Load tested to 100k concurrent users
- ✅ Capacity limits documented

---

## WEEK 4: BACKUP & DISASTER RECOVERY

### Task 4.1: Automated PostgreSQL Backups (20 HOURS)

**AWS RDS (Recommended)**:
```
1. Create RDS PostgreSQL instance
2. Enable automated backups:
   - Retention: 30 days
   - Backup window: 2 AM UTC (off-peak)
   - Multi-AZ: Yes (for high availability)

3. Test restore process monthly
```

**Self-Managed PostgreSQL**:
```bash
# Create backup script
#!/bin/bash
# /usr/local/bin/backup-mhub.sh

BACKUP_DIR="/backups/mhub"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mhub_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

# Full backup
pg_dump mhub_db | gzip > "$BACKUP_FILE"

# Keep last 30 days only
find "$BACKUP_DIR" -name "mhub_*.sql.gz" -mtime +30 -delete

# Upload to S3
aws s3 cp "$BACKUP_FILE" s3://mhub-backups/ \
  --storage-class GLACIER

echo "Backup completed: $BACKUP_FILE"
```

**Cron job**:
```
# /etc/cron.d/mhub-backup
0 2 * * * root /usr/local/bin/backup-mhub.sh
```

**Status**: [ ] COMPLETE

---

### Task 4.2: Test Backup Restoration (20 HOURS)

**Weekly restore test**:
```bash
#!/bin/bash
# /usr/local/bin/test-restore.sh

# Create test database
createdb mhub_test

# Restore latest backup
LATEST_BACKUP=$(aws s3 ls s3://mhub-backups/ \
  | sort | tail -n 1 | awk '{print $4}')

aws s3 cp "s3://mhub-backups/$LATEST_BACKUP" /tmp/restore.sql.gz

gunzip /tmp/restore.sql.gz

psql mhub_test < /tmp/restore.sql

# Run quick checks
psql mhub_test -c "SELECT COUNT(*) FROM users;"
psql mhub_test -c "SELECT COUNT(*) FROM posts;"

# Report results
if [ $? -eq 0 ]; then
  echo "✅ Restore test PASSED"
else
  echo "❌ Restore test FAILED - ALERT OPS TEAM"
  # Send alert to PagerDuty
fi

# Cleanup
dropdb mhub_test
rm /tmp/restore.sql
```

**Schedule**: Every Sunday at 3 AM

**Status**: [ ] COMPLETE

---

### Task 4.3: Document RTO/RPO (5 HOURS)

**Create `docs/DISASTER_RECOVERY.md`**:

```markdown
# Disaster Recovery Plan

## Recovery Time Objective (RTO)
- **Target**: 30 minutes
- **Maximum acceptable downtime**: 1 hour
- **Monitored metric**: Time from incident declaration to traffic restored

## Recovery Point Objective (RPO)
- **Target**: 1 day
- **Data loss acceptable**: Up to 24 hours of data
- **Backup frequency**: Every 6 hours (backup at 2 AM UTC)

## Failover Process

### Database Failure (3 nodes: primary + 2 replicas)
1. **Detection** (automated): Health check fails, PagerDuty alerts
2. **Investigation** (5 min): Determine if primary is recoverable
3. **Failover** (10 min): Promote replica to primary
4. **Traffic switch** (5 min): Update connection strings
5. **Verification** (5 min): Run smoke tests
6. **Total RTO**: 30 minutes

### Complete Data Center Failure (rare)
1. Restore from S3 backup to new RDS instance (10 min)
2. Run migration scripts (5 min)
3. Switch traffic to new database (5 min)
4. **Total RTO**: 20 minutes
5. **Data loss**: Up to 6 hours (backup file age)

## Testing Schedule
- Monthly: Database backup/restore test
- Quarterly: Full production failover simulation
- Annually: Data center failure scenario
```

**Status**: [ ] COMPLETE

---

### Week 4 Summary
**Hours**: 45 hours
**Deliverables**:
- ✅ Automated daily backups
- ✅ Backup restoration tested
- ✅ Disaster recovery plan documented
- ✅ RPO/RTO targets defined

---

## CRITICAL PATH COMPLETE ✅

**If all Week 1-4 tasks are complete:**
- ✅ Automated testing gates (no broken code deployed)
- ✅ Real-time production monitoring
- ✅ Verified no data loss (backups work)
- ✅ Error reporting operational
- ✅ Incident response procedures documented
- ✅ 100k concurrent user capacity verified

**You can NOW safely deploy to production with 1000-10k concurrent users** (not full 100k yet - that's Week 5-6)

---

## WEEKS 5-10: SCALING & HARDENING

See `PRODUCTION_LAUNCH_ROADMAP.md` for detailed Week 5-10 tasks:
- Week 5: Database replication
- Week 6: Containerization & Kubernetes
- Week 7: Frontend optimization
- Week 8: Security hardening
- Week 9-10: Documentation & go-live

---

## SUCCESS CHECKLIST FOR PRODUCTION LAUNCH

### PRE-LAUNCH (MUST COMPLETE)
- [ ] Week 1 items complete (Socket.io, CI/CD, Security)
- [ ] Week 2 items complete (Logging, Monitoring)
- [ ] Week 3 items complete (Tests, Load testing)
- [ ] Week 4 items complete (Backups, DR)
- [ ] All GitHub PR reviews approved
- [ ] 0 critical bugs from testing
- [ ] On-call team trained and available

### DAY 1 PRODUCTION LAUNCH
- [ ] Start with 1000 concurrent users (not 100k)
- [ ] Monitor all dashboards continuously
- [ ] On-call engineer available
- [ ] Status page live & updated
- [ ] Customer support briefed on known issues

### WEEK 1 POST-LAUNCH
- [ ] Gradually increase load to 10k concurrent
- [ ] Monitor error rates hourly
- [ ] Verify all real-time features operational
- [ ] 0 data loss incidents
- [ ] Response times under 500ms (p99)

### GO/NO-GO DECISION
**LAUNCH**: If all pre-launch items ✅
**HOLD**: If any critical item incomplete or failing tests
**ROLLBACK**: If >0.1% error rate or >2 second response time

---

**Print this checklist and post in your team Slack channel. Track progress weekly.**

---

**Questions?**

Contact your DevOps/Infrastructure team with:
- "Are we completing Week X tasks on schedule?"
- "Do we have all critical monitoring alerts configured?"
- "Has disaster recovery plan been tested?"

The answers determine if you can launch or need more time.
