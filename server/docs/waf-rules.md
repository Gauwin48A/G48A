# WAF (Web Application Firewall) Configuration Guide

## Recommended WAF Rules for MHub

### Cloudflare WAF Rules

#### 1. Rate Limiting Rules
```
Rule: Block excessive login attempts
Expression: (http.request.uri.path contains "/api/auth/login")
Action: Block after 10 requests per minute per IP
```

#### 2. Bot Protection
```
Rule: Challenge suspicious bots
Expression: (cf.client.bot) and not (cf.client_trust_score gt 50)
Action: Managed Challenge
```

#### 3. Geo-Blocking (Optional)
```
Rule: Block traffic from high-risk countries
Expression: (ip.geoip.country in {"XX" "YY" "ZZ"})
Action: Block
Note: Replace XX, YY, ZZ with actual country codes if needed
```

#### 4. SQL Injection Protection
```
Rule: Block SQL injection attempts
Expression: (http.request.uri.query contains "UNION" or 
             http.request.uri.query contains "SELECT" or
             http.request.uri.query contains "DROP" or
             http.request.uri.query contains "--")
Action: Block
```

#### 5. XSS Protection
```
Rule: Block XSS attempts
Expression: (http.request.uri contains "<script" or
             http.request.body contains "<script")
Action: Block
```

---

### AWS WAF Rules

#### Core Rule Set (CRS)
Enable the following managed rule groups:
- AWSManagedRulesCommonRuleSet
- AWSManagedRulesKnownBadInputsRuleSet
- AWSManagedRulesSQLiRuleSet
- AWSManagedRulesLinuxRuleSet

#### Custom Rules
```json
{
  "Name": "RateLimitLogin",
  "Priority": 1,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 100,
      "AggregateKeyType": "IP",
      "ScopeDownStatement": {
        "ByteMatchStatement": {
          "FieldToMatch": { "UriPath": {} },
          "PositionalConstraint": "CONTAINS",
          "SearchString": "/api/auth/"
        }
      }
    }
  },
  "Action": { "Block": {} }
}
```

---

### Implementation Checklist

- [x] Enable HTTPS-only mode (platform edge/proxy policy)
- [x] Configure DDoS protection (`apiLimiter` + edge controls)
- [x] Set up rate limiting on auth endpoints (`strictLoginLimiter` + route login limiter)
- [x] Enable bot protection (`wafRequestFilter` user-agent policy)
- [x] Configure geo-blocking if needed (`WAF_BLOCKED_COUNTRIES`)
- [x] Set up alerting for blocked requests (see `server/docs/MONITORING_ALERTING_OWNERSHIP.md`)
- [x] Review logs weekly (ops ownership matrix cadence)

---

## Proof of Enforcement (2026-02-27)

1. WAF middleware implemented: `server/src/middleware/wafEnforcement.js`
2. Global WAF mount in API runtime: `server/src/index.js`
3. Auth login route WAF rate limiter: `server/src/routes/auth.js`
4. Enforcement test suite:
   - `server/tests/waf.enforcement.test.js`
   - Command: `npm run test:waf`
   - Result: PASS
5. Alert ownership and runbook links:
   - `server/docs/MONITORING_ALERTING_OWNERSHIP.md`
   - `docs/INCIDENT_RESPONSE.md`

---

*Last Updated: 2026-02-27*
