# Incident Response Procedures

**VibeBox Security Incident Response Guide**

This document outlines procedures for responding to security incidents in the VibeBox platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Incident Classification](#incident-classification)
3. [Response Team](#response-team)
4. [Detection & Reporting](#detection--reporting)
5. [Response Procedures](#response-procedures)
6. [Post-Incident Activities](#post-incident-activities)
7. [Contact Information](#contact-information)

---

## Overview

Security incidents must be handled promptly and systematically to minimize damage, preserve evidence, and restore normal operations. This guide provides step-by-step procedures for incident response.

### Goals

- **Containment**: Stop the incident from spreading
- **Investigation**: Determine the scope and impact
- **Recovery**: Restore systems to normal operation
- **Learning**: Prevent future incidents

---

## Incident Classification

### Severity Levels

#### **P0 - Critical**
- Data breach affecting user data
- Unauthorized administrative access
- Complete system compromise
- Ransomware or destructive attacks
- **Response Time**: Immediate (< 15 minutes)
- **Escalation**: CEO, CTO, CISO

#### **P1 - High**
- Failed authentication attacks (brute force)
- Unauthorized access attempts
- Malicious code detected
- Service disruption affecting all users
- **Response Time**: < 1 hour
- **Escalation**: Security Team, Engineering Lead

#### **P2 - Medium**
- Suspicious user behavior
- Configuration vulnerabilities
- Partial service disruption
- Compliance violations
- **Response Time**: < 4 hours
- **Escalation**: Security Team

#### **P3 - Low**
- Security policy violations
- Minor vulnerabilities
- Routine security events
- **Response Time**: < 24 hours
- **Escalation**: As needed

---

## Response Team

### Roles & Responsibilities

#### **Incident Commander (IC)**
- Overall incident coordination
- Decision-making authority
- Stakeholder communication
- Resource allocation

#### **Technical Lead**
- Technical investigation
- System analysis
- Remediation implementation
- Evidence collection

#### **Communications Lead**
- Internal communications
- Customer notifications
- Regulatory reporting
- Media relations (if needed)

#### **Security Analyst**
- Log analysis
- Threat intelligence
- Attack pattern identification
- Security monitoring

---

## Detection & Reporting

### Detection Sources

1. **Automated Monitoring**
   - Security event monitoring (audit logs)
   - Failed authentication alerts
   - Resource usage anomalies
   - Error rate spikes

2. **Manual Reporting**
   - User reports (security@vibebox.com)
   - Staff observations
   - Security audits
   - External notifications

### Reporting Procedures

#### Internal Reporting
1. Email: security@vibebox.com
2. Slack: #security-incidents
3. PagerDuty: Security team on-call

#### External Reporting
- **Users**: security@vibebox.com
- **Bug Bounty**: security+bounty@vibebox.com
- **Responsible Disclosure**: 90-day disclosure policy

---

## Response Procedures

### Phase 1: Detection & Analysis (0-15 minutes)

#### Immediate Actions
1. **Acknowledge the incident**
   ```bash
   # Check audit logs for suspicious activity
   grep "auth_login_failed\|critical" /var/log/vibebox/audit.log
   ```

2. **Classify severity** (P0-P3)

3. **Activate response team**
   - P0/P1: Page on-call team
   - P2/P3: Email security team

4. **Create incident ticket**
   ```
   Title: [SECURITY] Brief description
   Severity: P0/P1/P2/P3
   Reporter: Name/email
   Time detected: UTC timestamp
   ```

#### Initial Assessment
```bash
# Review recent audit logs
npm run audit:security-events -- --hours 24

# Check failed authentication attempts
npm run audit:failed-auth -- --hours 1

# Check active sessions
npm run sessions:list -- --active

# Review recent user activity
npm run audit:user-logs -- --user-id <USER_ID> --hours 24
```

### Phase 2: Containment (15-60 minutes)

#### Immediate Containment
1. **Isolate affected systems**
   ```bash
   # Stop affected environment
   npm run env:stop -- --id <ENV_ID>

   # Disable compromised user account
   npm run user:disable -- --id <USER_ID>

   # Revoke all user sessions
   npm run sessions:revoke-all -- --user-id <USER_ID>
   ```

2. **Block malicious IPs** (if applicable)
   ```bash
   # Add IP to firewall blocklist
   sudo ufw deny from <IP_ADDRESS>

   # Update rate limiting
   # Edit src/api/middleware/rateLimit.ts
   ```

3. **Enable enhanced monitoring**
   ```bash
   # Increase log verbosity
   LOG_LEVEL=debug npm run dev

   # Enable audit logging for all operations
   AUDIT_ALL_OPERATIONS=true npm run dev
   ```

#### Evidence Preservation
```bash
# Backup current logs
cp -r /var/log/vibebox /var/log/vibebox.incident-$(date +%Y%m%d)

# Export database audit logs
npm run audit:export -- --since "2024-01-01" --output incident-audit.json

# Take system snapshot (if cloud provider supports)
# AWS: aws ec2 create-snapshot
# GCP: gcloud compute disks snapshot
```

### Phase 3: Eradication (1-4 hours)

#### Remove Threat
1. **Identify root cause**
   - Review audit logs
   - Analyze attack vectors
   - Identify vulnerabilities

2. **Patch vulnerabilities**
   ```bash
   # Update dependencies
   npm audit fix
   npm update

   # Apply security patches
   git pull origin security-patches

   # Rebuild and deploy
   npm run build
   npm run deploy:production
   ```

3. **Reset compromised credentials**
   ```bash
   # Force password reset
   npm run auth:force-password-reset -- --user-id <USER_ID>

   # Rotate JWT secrets (with zero-downtime)
   npm run auth:rotate-jwt-secrets

   # Rotate database credentials
   npm run db:rotate-credentials
   ```

### Phase 4: Recovery (4-24 hours)

#### Restore Services
1. **Validate fixes**
   ```bash
   # Run security tests
   npm run test:security

   # Run integration tests
   npm test

   # Manual verification
   npm run dev
   ```

2. **Re-enable systems**
   ```bash
   # Re-enable user account (if appropriate)
   npm run user:enable -- --id <USER_ID>

   # Restart environments
   npm run env:start -- --id <ENV_ID>
   ```

3. **Monitor closely**
   - Watch for repeat incidents
   - Monitor error rates
   - Check audit logs hourly

### Phase 5: Follow-up (24-72 hours)

#### Communications
1. **Internal notification**
   - Summary of incident
   - Impact assessment
   - Remediation steps
   - Lessons learned

2. **Customer notification** (if data breach)
   - What happened
   - What data was affected
   - What we're doing
   - What users should do

3. **Regulatory reporting** (if required)
   - GDPR: 72 hours
   - CCPA: As required
   - Other: Per jurisdiction

---

## Post-Incident Activities

### Incident Report

Create a detailed incident report within 5 business days:

```markdown
# Incident Report: [Title]

**Date**: YYYY-MM-DD
**Severity**: P0/P1/P2/P3
**Duration**: X hours
**Impact**: Description

## Summary
Brief overview of the incident

## Timeline
- 00:00 UTC: Incident detected
- 00:15 UTC: Response team activated
- 00:30 UTC: Containment complete
- 02:00 UTC: Services restored

## Root Cause
Technical analysis of what caused the incident

## Impact Assessment
- Users affected: X
- Data compromised: Yes/No
- Service downtime: X hours
- Financial impact: $X

## Response Evaluation
What went well:
- Quick detection
- Effective containment

What could be improved:
- Faster escalation
- Better monitoring

## Action Items
1. [ ] Fix vulnerability XYZ
2. [ ] Implement additional monitoring
3. [ ] Update response procedures
4. [ ] Conduct security training

## Lessons Learned
Key takeaways for future prevention
```

### Preventive Measures

1. **Update security controls**
2. **Enhance monitoring**
3. **Patch vulnerabilities**
4. **Security training**
5. **Update runbooks**

### Review Meeting

Conduct a post-incident review within 1 week:
- **Attendees**: Response team, stakeholders
- **Agenda**:
  - Timeline review
  - Root cause analysis
  - Response effectiveness
  - Improvement opportunities
  - Action item assignment

---

## Contact Information

### Emergency Contacts

- **Security Team**: security@vibebox.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX (PagerDuty)
- **CEO**: ceo@vibebox.com
- **CTO**: cto@vibebox.com
- **Legal**: legal@vibebox.com

### External Resources

- **Cloud Provider Support**:
  - AWS: 1-866-243-1861
  - GCP: 1-877-355-5787
  - Azure: 1-800-867-1389

- **Law Enforcement**:
  - FBI Cyber Division: https://www.fbi.gov/investigate/cyber
  - Local authorities: 911 (US)

- **Security Vendors**:
  - Forensics partner: TBD
  - Security consultant: TBD

---

## Appendix

### Useful Commands

```bash
# View audit logs
npm run audit:logs

# Export audit logs
npm run audit:export -- --format json --output audit.json

# Check security events
npm run audit:security-events -- --severity high --hours 24

# List active sessions
npm run sessions:list

# Revoke user sessions
npm run sessions:revoke-all -- --user-id <ID>

# Check failed auth attempts by IP
npm run audit:failed-auth -- --ip <IP_ADDRESS>

# Database backup
npm run db:backup

# Database restore
npm run db:restore -- --file backup.sql
```

### Log Locations

```
/var/log/vibebox/
├── application.log      # Application logs
├── audit.log           # Audit trail
├── error.log           # Error logs
├── access.log          # HTTP access logs
└── security.log        # Security events
```

### Incident Severity Matrix

| Factor | P0 | P1 | P2 | P3 |
|--------|----|----|----|----|
| Data at risk | Customer data | Internal data | Configuration | Logs |
| Access level | Admin | User | Limited | Read-only |
| Impact | All users | Many users | Few users | Single user |
| Urgency | Immediate | Urgent | Important | Routine |

---

**Last Updated**: 2025-10-03
**Next Review**: 2025-11-03
**Owner**: Security Team
