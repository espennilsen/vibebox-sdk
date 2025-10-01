# Contract Tests Refactoring - Documentation Index

## Overview

This directory contains comprehensive documentation for refactoring the 196 contract tests to use new helper functions that eliminate code duplication and fix authentication issues.

## Current Status

- **Total Tests**: 196
- **Passing**: 91 (46.4%)
- **Failing**: 105 (53.6%)
- **Root Cause**: Tests using `createMockToken()` which returns invalid JWT tokens

## Refactoring Progress

- [x] Helper functions created in `helpers/test-utils.ts`
- [x] Reference example completed (`auth/login.test.ts`)
- [x] Documentation written
- [ ] Bulk refactoring in progress

## Documentation Guide

### 1. Quick Start (Start Here!) 🚀
**[QUICK_START.md](./QUICK_START.md)** - Fast-track guide for developers

**Contains:**
- TL;DR and quick patterns
- Step-by-step refactoring instructions
- Common scenarios with code examples
- Common mistakes to avoid
- Complete file transformation example

**Best for:** Developers who want to start refactoring immediately

**Estimated reading time:** 10 minutes

---

### 2. Complete Analysis 📊
**[REFACTORING_ANALYSIS.md](./REFACTORING_ANALYSIS.md)** - Comprehensive technical analysis

**Contains:**
- Complete helper function reference with TSDoc
- All 19 test files categorized by type
- Refactoring strategy divided into phases
- Common patterns reference
- Migration checklist

**Best for:** Understanding the full scope and planning the work

**Estimated reading time:** 20 minutes

---

### 3. Refactoring Guide 📖
**[TEST_REFACTORING_GUIDE.md](./TEST_REFACTORING_GUIDE.md)** - Detailed guide

**Contains:**
- Problem overview and solutions
- Expected helper functions documentation
- Refactoring patterns and examples
- Test file categories breakdown
- Benefits and next steps

**Best for:** Understanding why we're refactoring and the methodology

**Estimated reading time:** 15 minutes

---

### 4. Summary Report 📋
**[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - Executive summary

**Contains:**
- What was accomplished
- Test file categories with counts
- Key benefits achieved
- Recommended next steps
- Success criteria and progress tracking

**Best for:** Project managers and stakeholders

**Estimated reading time:** 5 minutes

---

### 5. Reference Examples 💡

**Production Reference:**
- **[auth/login.test.ts](./auth/login.test.ts)** ✅ Fully refactored
  - Use this as your primary reference when refactoring other files
  - Production-ready code following the new pattern

**Learning Example:**
- **[auth/login.test.REFACTORED.ts](./auth/login.test.REFACTORED.ts)** - Annotated
  - Same as above but with detailed comments explaining each change
  - Great for understanding the transformation

---

### 6. Helper Functions 🛠️

**[helpers/test-utils.ts](./helpers/test-utils.ts)** - All helper functions

**Contains:**
- Authentication helpers (`getAuthToken`, `createTestUser`)
- API request helpers (`apiRequest`, `authenticatedRequest`)
- Test data generators (`generateUser`, `generateTeam`, `generateProject`, `generateEnvironment`)
- Resource management (`createResource`, `deleteResource`)
- Cleanup helpers (`cleanupTestData`, `cleanupTestUsers`)
- Schema validators (existing, unchanged)

All functions have comprehensive TSDoc comments with usage examples.

---

## Test Files Categorization

### Category A: Standard Authenticated Endpoints (14 files)
**Pattern:** Use `getAuthToken()` + `authenticatedRequest()`

1. users/get-profile.test.ts
2. users/update-profile.test.ts
3. teams/create-team.test.ts
4. teams/get-team.test.ts
5. teams/list-teams.test.ts
6. teams/update-team.test.ts
7. teams/delete-team.test.ts
8. teams/add-member.test.ts
9. teams/list-members.test.ts
10. projects/projects.test.ts
11. environments/environments.test.ts
12. sessions/sessions.test.ts
13. extensions/extensions.test.ts
14. logs/logs.test.ts

### Category B: Public Endpoints (2 files)
**Pattern:** Use `apiRequest()` WITHOUT token

1. auth/login.test.ts ✅ **REFACTORED** (Reference Example)
2. auth/register.test.ts

### Category C: Special Authentication (2 files)
**Pattern:** Needs review, may need custom helpers

1. auth/refresh.test.ts (uses refresh tokens)
2. auth/oauth.test.ts (OAuth flow)

### Category D: WebSocket (1 file)
**Pattern:** Needs WebSocket-specific helpers

1. websocket/websocket.test.ts

---

## Quick Reference Cheat Sheet

### Authenticated Endpoint
```typescript
import { getAuthToken, authenticatedRequest } from '../helpers/test-utils';

const token = await getAuthToken();
const response = await authenticatedRequest('GET', '/users/me', token);
expect(response.status).toBe(200);
```

### Public Endpoint
```typescript
import { apiRequest } from '../helpers/test-utils';

const response = await apiRequest('POST', '/auth/login', {
  body: { email: 'user@example.com', password: 'pass' }
});
expect(response.status).toBe(200);
```

### With Test Data
```typescript
import { generateTeam, authenticatedRequest } from '../helpers/test-utils';

const token = await getAuthToken();
const teamData = generateTeam();
const response = await authenticatedRequest('POST', '/teams', token, {
  body: teamData
});
```

---

## How to Use This Documentation

### Scenario 1: "I want to start refactoring now"
1. Read **[QUICK_START.md](./QUICK_START.md)** (10 min)
2. Look at **[auth/login.test.ts](./auth/login.test.ts)** as reference
3. Pick a file from Category A and start refactoring
4. Run tests to verify: `npm test -- path/to/file.test.ts`

### Scenario 2: "I need to understand the full scope"
1. Read **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** (5 min)
2. Review **[REFACTORING_ANALYSIS.md](./REFACTORING_ANALYSIS.md)** (20 min)
3. Plan your work in batches (see Phase 2 in analysis)
4. Execute phase by phase

### Scenario 3: "I want to understand why and how"
1. Read **[TEST_REFACTORING_GUIDE.md](./TEST_REFACTORING_GUIDE.md)** (15 min)
2. Check **[auth/login.test.REFACTORED.ts](./auth/login.test.REFACTORED.ts)** for detailed examples
3. Review helper function TSDoc in **[helpers/test-utils.ts](./helpers/test-utils.ts)**
4. Start with one file as a test

### Scenario 4: "I'm a stakeholder/manager"
1. Read **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** (5 min)
2. Review the "Key Benefits" section
3. Check the "Expected Outcomes" section
4. That's it!

---

## Running Tests

```bash
# Run all contract tests
npm test -- tests/contract/

# Run specific category
npm test -- tests/contract/users/
npm test -- tests/contract/teams/

# Run specific file
npm test -- tests/contract/auth/login.test.ts

# Watch mode (during development)
npm test -- tests/contract/users/ --watch

# Run with coverage
npm run test:coverage
```

---

## Refactoring Workflow

### Recommended Batch Approach

**Phase 1: Complete Public Endpoints** (1 file remaining)
- [ ] auth/register.test.ts

**Phase 2: Batch Update Category A** (14 files)
- Batch 1: users/*.test.ts (2 files)
- Batch 2: teams/*.test.ts (7 files)
- Batch 3: projects, environments, sessions (3 files)
- Batch 4: extensions, logs (2 files)

**Phase 3: Special Cases** (3 files)
- Review and handle Category C (2 files)
- Review and handle Category D (1 file)

### Per Batch Process:
1. Refactor 2-7 files using the pattern
2. Run tests for that batch
3. Fix any issues
4. Commit changes
5. Move to next batch

---

## Expected Outcomes

### Code Quality Improvements
- **30-40% less boilerplate** per test file
- **Single source of truth** for API configuration
- **Consistent patterns** across all 196 tests
- **Better readability** - tests focus on behavior, not setup

### Reliability Improvements
- **Valid JWT tokens** instead of broken mocks
- **Real authentication flow** tested
- **Higher confidence** in test results
- **Catch more bugs** earlier in development

### Test Results Expected
- **Before**: 91/196 passing (46.4%)
- **After**: >185/196 passing (>95%)
- **Impact**: 105 failing tests should pass once refactored with valid auth

---

## Document Summary

| Document | Purpose | Audience | Length | Priority |
|----------|---------|----------|--------|----------|
| **REFACTORING_INDEX.md** (this file) | Navigation hub | Everyone | Medium | Start here |
| **QUICK_START.md** | Fast-track guide | Developers | Medium | High |
| **REFACTORING_ANALYSIS.md** | Technical analysis | Tech leads | Long | Medium |
| **TEST_REFACTORING_GUIDE.md** | Detailed guide | Developers | Long | Medium |
| **REFACTORING_SUMMARY.md** | Executive summary | Stakeholders | Short | Low |
| **login.test.ts** | Production reference | Developers | Short | High |
| **login.test.REFACTORED.ts** | Learning example | Developers | Medium | Medium |

---

## Support and Troubleshooting

### Common Issues

**Issue: "Tests still failing after refactoring"**
- Verify database tables exist
- Check that API endpoints are implemented
- Ensure you're using `await` with `getAuthToken()`

**Issue: "Import errors"**
- Verify helper function names (check test-utils.ts)
- Ensure relative import paths are correct
- Check that you've removed `supertest` import

**Issue: "Can't find reference examples"**
- Reference: `auth/login.test.ts`
- Annotated: `auth/login.test.REFACTORED.ts`
- Helpers: `helpers/test-utils.ts`

### Getting Help

1. Check the reference example first: `auth/login.test.ts`
2. Review the QUICK_START.md for your scenario
3. Check helper function TSDoc comments in `test-utils.ts`
4. Verify async/await usage
5. Run a single test file to isolate issues

---

## Contributing

When refactoring test files:
1. Follow the patterns in reference examples
2. Test your changes before committing
3. Update documentation if you find new patterns
4. Help improve these docs for others

---

## License

MIT License - Same as the main VibeBox project

---

**Last Updated**: 2025-10-01
**Status**: Phase 1 Complete - Ready for bulk refactoring
**Reference**: `/workspace/backend/tests/contract/auth/login.test.ts`
**Next Phase**: Refactor Category A files in batches

---

## Quick Navigation

- **Want to start now?** → [QUICK_START.md](./QUICK_START.md)
- **Need full details?** → [REFACTORING_ANALYSIS.md](./REFACTORING_ANALYSIS.md)
- **Want examples?** → [auth/login.test.ts](./auth/login.test.ts)
- **Need help?** → Check "Support and Troubleshooting" section above
