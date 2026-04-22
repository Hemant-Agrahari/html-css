# Module: Debugging — Systematic Bug Fixing

## When This Module Applies

Use this module when implementing TASK-### entries involving:
- Bug fixes and defect resolution
- Root cause analysis
- Regression investigation
- Performance issue diagnosis
- Error log analysis

---

## Standards & Conventions

### 4-Phase Debugging Process

Every bug fix follows this sequence. Do NOT skip phases.

#### Phase 1: Reproduce

Before fixing anything, reproduce the bug reliably:

1. Get the exact steps to trigger the issue
2. Identify the expected behavior (from FRD / acceptance criteria)
3. Identify the actual behavior
4. Determine if it's consistent or intermittent
5. Write a failing test that captures the bug

```
BUG REPORT:
  TASK: TASK-###
  Steps: [exact reproduction steps]
  Expected: [from FR-### / AC-###]
  Actual: [what happens instead]
  Frequency: [always / intermittent / environment-specific]
  Failing test: [test file and name]
```

#### Phase 2: Isolate

Narrow down where the bug occurs:

1. **Binary search (bisect)** — if it worked before, find the commit that broke it:
   ```bash
   git bisect start
   git bisect bad HEAD
   git bisect good <last-known-good-commit>
   ```

2. **Layer isolation** — determine which layer is at fault:
   - Frontend rendering? → Check component state and props
   - API response? → Check with curl/Postman directly
   - Database query? → Check query results directly
   - Business logic? → Check service layer with unit test

3. **Input isolation** — find the minimal input that triggers the bug

#### Phase 3: Diagnose

Find the root cause, not just the symptom:

**5 Whys technique:**
```
1. Why does the user see a blank screen?
   → The component throws during render.
2. Why does it throw?
   → It accesses .name on a null object.
3. Why is the object null?
   → The API returns 200 but with no data for deleted users.
4. Why does the API return 200 for deleted users?
   → The query doesn't filter soft-deleted records.
5. Why doesn't it filter soft-deleted records?
   → The query was written before soft delete was implemented.

ROOT CAUSE: Query predates soft-delete implementation, missing WHERE deleted_at IS NULL.
```

**Logging strategy for diagnosis:**
```typescript
// Add structured logs at key decision points
logger.debug("user.fetch", { userId, includeDeleted: false });
logger.debug("user.fetch.result", { userId, found: !!user, deletedAt: user?.deletedAt });
```

#### Phase 4: Fix

1. Fix the root cause, not the symptom
2. Verify the failing test now passes
3. Add a regression test specifically for this bug
4. Check for similar patterns elsewhere in the codebase
5. Remove diagnostic logging added in Phase 3

---

## Implementation Checklist

- [ ] Bug reproduced with a failing test BEFORE attempting a fix
- [ ] Root cause identified (not just the symptom)
- [ ] Fix targets the root cause
- [ ] Original failing test now passes
- [ ] Regression test added (named `test_TASK###_regression_[description]`)
- [ ] Similar patterns checked elsewhere (grep for the same anti-pattern)
- [ ] No unrelated changes included in the fix
- [ ] Fix documented in solutions-learned.jsonl (if pattern is likely to recur)

---

## Code Patterns

### Regression Test

```typescript
// Implements: TASK-### (FR-###) [SCR-###]

it("test_TASK015_regression_soft_deleted_users_excluded_from_list", async () => {
  // Arrange — reproduce the exact scenario that caused the bug
  const activeUser = await createUser({ name: "Active", deletedAt: null });
  const deletedUser = await createUser({ name: "Deleted", deletedAt: new Date() });

  // Act
  const result = await UserService.list();

  // Assert — the fix ensures deleted users are excluded
  expect(result.users).toContainEqual(expect.objectContaining({ id: activeUser.id }));
  expect(result.users).not.toContainEqual(expect.objectContaining({ id: deletedUser.id }));
});
```

### Structured Error Logging

```typescript
// When adding diagnostic logging, use structured format:
import { logger } from "../utils/logger.js";

try {
  const result = await riskyOperation(input);
  logger.info("operation.success", { operation: "riskyOperation", inputId: input.id });
} catch (error) {
  logger.error("operation.failed", {
    operation: "riskyOperation",
    inputId: input.id,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  throw error;
}
```

### Git Bisect Script

```bash
# Automated bisect with a test command
git bisect start
git bisect bad HEAD
git bisect good v1.2.0
git bisect run npm test -- --filter "test_TASK015"
# Git will find the exact commit that introduced the bug
```

---

## Solutions-Learned Integration

After every bug fix, append to `docs/memory/solutions-learned.jsonl`:

```json
{
  "timestamp": "2026-03-18T10:00:00Z",
  "error": "Soft-deleted users appearing in user list",
  "solution": "Add WHERE deleted_at IS NULL to all default query scopes",
  "context": "UserService.list() query predated soft-delete implementation",
  "skillName": "dev/debugging",
  "severity": "high",
  "tags": ["soft-delete", "query", "data-leak"],
  "rootCause": "Query written before soft-delete feature; not updated when soft-delete was added"
}
```

---

## Quality Gates

1. **Reproduction first** — a failing test exists BEFORE the fix
2. **Root cause addressed** — fix is not a band-aid (e.g., wrapping in try/catch without fixing the underlying issue)
3. **Regression test added** — the specific bug scenario is permanently tested
4. **No collateral damage** — existing tests still pass after the fix
5. **Pattern scan** — similar code paths checked for the same issue

---

## Common Pitfalls

- **Fixing the symptom** — adding a null check instead of fixing why the value is null.
- **Skipping reproduction** — "I think I know what's wrong" without proving it. Always reproduce first.
- **Fixing too much** — refactoring adjacent code while fixing a bug. Keep the fix minimal and focused.
- **No regression test** — fixing the bug but not adding a test. The same bug will return.
- **Cargo-cult debugging** — changing things randomly until it works. Follow the 4-phase process.
- **Leaving diagnostic logs** — `console.log("HERE")` committed to the codebase. Clean up after diagnosis.
