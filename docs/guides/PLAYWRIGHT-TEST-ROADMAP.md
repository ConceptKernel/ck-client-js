# Playwright Test Suite Roadmap - ConceptKernel Client JS
**Version:** v1.3.18
**Date:** 2025-12-04
**Status:** Implementation in Progress

## Executive Summary

Comprehensive Playwright test suite to verify bidirectional communication between `@conceptkernel/ck-client-js` and ConceptKernel backend services. Tests cover anonymous sessions, authentication upgrades, role-based access control, and high-volume performance scenarios with project-level isolation.

## Objectives

1. **Absolute Certainty** - Verify bidirectional WebSocket communication works reliably
2. **Authentication Flow** - Test anonymous → authenticated user upgrade path
3. **RBAC Verification** - Confirm role-based access control enforcement
4. **Performance Metrics** - Measure 10,000 message burst throughput, duration, and space
5. **Project Isolation** - Test multi-project scenarios with independent port ranges
6. **Continuous Evolution** - Establish evolving test group for ongoing verification

---

## Staged Implementation Plan

### Stage 1: Anonymous User Flow (Foundation)
**Status:** 🏗️ In Progress
**Files:** `test/e2e.anonymous.spec.js`
**Duration:** Initial implementation
**Priority:** CRITICAL

**Test Scenarios:**
- ✅ Create new anonymous session
- ✅ Establish WebSocket connection to System.Gateway
- ✅ Verify connection handshake and session token
- ✅ Test echo service (send message → receive echo)
- ✅ Verify bidirectional message flow
- ✅ Test connection stability (no unexpected disconnects)
- ✅ Validate session cleanup on disconnect

**Success Criteria:**
- All anonymous operations complete without authentication
- Echo service responds within 100ms
- Connection remains stable for 60 seconds
- Session cleanup leaves no orphaned resources

**Test Data Collected:**
- Connection establishment time
- Message round-trip latency
- Session token format and validity
- WebSocket event sequence

---

### Stage 2: Authentication and Role Upgrade
**Status:** 📋 Planned
**Files:** `test/e2e.auth-upgrade.spec.js`
**Duration:** After Stage 1
**Priority:** HIGH

**Test Scenarios:**
- Upgrade anonymous session to authenticated user
- Test with multiple user roles:
  - `system-admin` (full access)
  - `developer` (limited access)
  - `guest` (read-only)
- Verify JWT token exchange
- Test session persistence across reconnects
- Validate role inheritance and permission escalation

**Success Criteria:**
- Anonymous → authenticated upgrade completes <200ms
- Role-based operations succeed/fail correctly
- Session token refresh works automatically
- Authenticated session survives browser page reload

**Test Data Collected:**
- Token upgrade duration
- Role verification latency
- Permission check response times
- Session refresh frequency

---

### Stage 3: Negative Test Cases (RBAC Enforcement)
**Status:** 📋 Planned
**Files:** `test/e2e.access-denied.spec.js`
**Duration:** After Stage 2
**Priority:** HIGH

**Test Scenarios:**
- Guest user attempts admin operation → 403 Forbidden
- Developer attempts system-level config change → 403 Forbidden
- Unauthenticated user attempts protected resource → 401 Unauthorized
- Expired token usage → 401 Unauthorized + auto-refresh
- Invalid role claim → 403 Forbidden
- Cross-project access without permission → 403 Forbidden

**Success Criteria:**
- All unauthorized operations return proper HTTP status codes
- Error messages are informative but secure (no info leakage)
- Failed attempts are logged for audit
- Rate limiting prevents brute force attempts

**Test Data Collected:**
- Error response times
- Error message formats
- Audit log entries
- Rate limit thresholds

---

### Stage 4: Performance Testing (10,000 Message Burst)
**Status:** 📋 Planned
**Files:** `test/e2e.performance.spec.js`
**Duration:** After Stage 3
**Priority:** CRITICAL

**Test Scenarios:**
- Send 10,000 messages in continuous burst
- Measure throughput (messages/second)
- Monitor memory usage during burst
- Verify all messages delivered in order
- Test backpressure handling
- Measure connection stability under load

**Metrics Collected:**
1. **Duration:** Total time for 10,000 messages
2. **Throughput:** Messages per second (target: >1000 msg/s)
3. **Latency:**
   - P50 (median)
   - P95 (95th percentile)
   - P99 (99th percentile)
   - Max latency
4. **Space Occupied:**
   - Browser memory usage (heap size)
   - Network bandwidth consumed
   - Server-side storage (if persisted)
5. **Reliability:**
   - Message delivery success rate (target: 100%)
   - Out-of-order delivery count (target: 0)
   - Connection drops (target: 0)

**Success Criteria:**
- All 10,000 messages delivered successfully
- Throughput >1000 messages/second
- P95 latency <50ms
- Memory usage stays <100MB
- Zero connection drops
- No message loss or reordering

**Performance Baselines (to be established):**
```javascript
{
  "duration_seconds": null,  // To be measured
  "throughput_msg_per_sec": null,  // Target: >1000
  "latency_p50_ms": null,  // Target: <10ms
  "latency_p95_ms": null,  // Target: <50ms
  "latency_p99_ms": null,  // Target: <100ms
  "memory_peak_mb": null,  // Target: <100MB
  "bandwidth_mb": null,  // To be measured
  "message_loss_count": 0,  // Must be 0
  "connection_drops": 0  // Must be 0
}
```

**Test Output:**
- JSON performance report saved to `test-results/performance-{timestamp}.json`
- Console output with real-time metrics
- Performance trend analysis (compare with previous runs)

---

### Stage 5: Project-Level Isolation
**Status:** 📋 Planned
**Files:** `test/e2e.multi-project.spec.js`
**Duration:** After Stage 4
**Priority:** MEDIUM

**Test Scenarios:**
- Create multiple temporary test projects
- Each project gets isolated 200-port range
- Verify cross-project message isolation
- Test service discovery per project
- Confirm .ckproject and .ckports independence
- Test concurrent operations across projects

**Project Test Matrix:**
```javascript
[
  { name: "project-A", basePort: 56000, slot: 1 },
  { name: "project-B", basePort: 56200, slot: 2 },
  { name: "project-C", basePort: 56400, slot: 3 }
]
```

**Success Criteria:**
- Projects cannot see each other's messages
- Port ranges never overlap
- Service discovery returns correct project services
- Concurrent operations don't interfere
- Project cleanup removes all resources

**Test Data Collected:**
- Port allocation correctness
- Message isolation verification
- Service discovery accuracy
- Resource cleanup completeness

---

## Test Evolution Strategy

### Continuous Integration
- Run Playwright tests on every commit
- Fail build if any test fails
- Generate test coverage reports
- Track performance metrics over time

### Test Maintenance
- Review and update tests with each feature release
- Add regression tests for every bug fix
- Maintain performance baselines
- Document breaking changes

### Metrics Dashboard
Create `test-results/dashboard.html` showing:
- Test pass/fail trends
- Performance metrics over time
- Coverage percentage
- Flaky test detection

### Test Archival
After each test run:
1. Save results to `test-results/archive/{timestamp}/`
2. Include:
   - Test logs
   - Screenshots/videos (on failure)
   - Performance metrics JSON
   - Browser console output
3. Cleanup old archives (keep last 30 days)

---

## Implementation Timeline

| Stage | Description | Status | Files Created |
|-------|-------------|--------|---------------|
| 1 | Anonymous User Flow | 🏗️ In Progress | `test/e2e.anonymous.spec.js` |
| 2 | Auth Upgrade | 📋 Planned | `test/e2e.auth-upgrade.spec.js` |
| 3 | Negative Tests | 📋 Planned | `test/e2e.access-denied.spec.js` |
| 4 | Performance (10K) | 📋 Planned | `test/e2e.performance.spec.js` |
| 5 | Multi-Project | 📋 Planned | `test/e2e.multi-project.spec.js` |

---

## Test Environment Requirements

### Prerequisites
1. **Running ConceptKernel Services:**
   - System.Gateway (base_port + 0)
   - System.Oidc.Provider (base_port + 2)
   - System.Oidc.Token (base_port + 5)
   - At least one test kernel with echo service

2. **Environment Variables:**
   ```bash
   CK_PROJECT_PATH=/path/to/test/project
   CK_BASE_PORT=56000  # Or read from .ckproject
   CK_TEST_USER=alice
   CK_TEST_PASS=alice123
   ```

3. **Test User Accounts:**
   - `alice` / `alice123` (user, developer, admin roles)
   - `bob` / `bob123` (user, developer roles)
   - `carol` / `carol123` (user role)

### Test Data Management
- Use temporary directories for each test run
- Create isolated .ckproject files per test
- Cleanup after test completion
- No persistent state between test runs

---

## Success Metrics (Overall)

**Coverage Targets:**
- Line coverage: >80%
- Branch coverage: >75%
- E2E scenario coverage: 100% of critical paths

**Performance Targets:**
- Test suite completion: <10 minutes
- 10,000 message test: <30 seconds
- Zero flaky tests (3-run stability check)

**Quality Targets:**
- All tests pass on main branch
- No skipped tests in CI
- Performance regression threshold: 10% degradation triggers alert

---

## Risk Mitigation

### Flaky Test Prevention
- Use explicit waits (not arbitrary timeouts)
- Verify service readiness before tests
- Implement retry logic for network operations
- Isolate tests from each other

### Performance Regression Detection
- Establish baseline metrics in v1.3.18
- Alert on >10% degradation
- Compare against previous 10 runs
- Investigate anomalies immediately

### Test Maintenance
- Review tests quarterly
- Update with breaking changes
- Archive obsolete tests
- Document test rationale

---

## Appendix: Test File Structure

```
ck-client-js/
├── test/
│   ├── e2e.anonymous.spec.js          # Stage 1 - NEW
│   ├── e2e.auth-upgrade.spec.js       # Stage 2 - NEW
│   ├── e2e.access-denied.spec.js      # Stage 3 - NEW
│   ├── e2e.performance.spec.js        # Stage 4 - NEW
│   ├── e2e.multi-project.spec.js      # Stage 5 - NEW
│   ├── unit.spec.js                   # Existing
│   ├── integration.spec.js            # Existing
│   ├── e2e.auth.spec.js              # Existing
│   ├── browser-debug.spec.js         # Existing
│   ├── setup.js                       # Test helpers
│   └── helpers/
│       ├── project-setup.js           # Create temp projects - NEW
│       ├── metrics-collector.js       # Performance tracking - NEW
│       └── service-readiness.js       # Wait for services - NEW
├── test-results/
│   ├── archive/                       # Historical results
│   ├── performance-{timestamp}.json   # Performance data
│   └── dashboard.html                 # Metrics visualization
└── PLAYWRIGHT-TEST-ROADMAP.md         # This document
```

---

## Notes

- **Project Isolation:** Each test creates isolated project directory with unique base port
- **Cleanup Strategy:** Archive results, destroy test projects after completion
- **Metrics Focus:** Duration, speed (throughput), space (memory/bandwidth)
- **Evolution Plan:** Keep tests as evolving group, add scenarios as features develop
- **Absolute Certainty:** 10,000 message test ensures bidirectional communication reliability

---

**Document Version:** v1.3.18
**Status:** Implementation Started - Stage 1 in Progress
**Last Updated:** 2025-12-04
**Next Review:** After Stage 1 completion
