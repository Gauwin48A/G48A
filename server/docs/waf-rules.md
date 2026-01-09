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

- [ ] Enable HTTPS-only mode
- [ ] Configure DDoS protection
- [ ] Set up rate limiting on auth endpoints
- [ ] Enable bot protection
- [ ] Configure geo-blocking if needed
- [ ] Set up alerting for blocked requests
- [ ] Review logs weekly

---

*Last Updated: 2026-01-04*
