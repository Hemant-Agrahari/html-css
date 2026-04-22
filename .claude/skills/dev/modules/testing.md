# Module: Testing — Unit, Integration, E2E

## When This Module Applies

Use this module when implementing TASK-### entries involving:
- Unit tests (isolated function/component testing)
- Integration tests (API endpoints, database queries)
- End-to-end tests (Playwright, full user flows)
- Test fixtures and factories
- Coverage improvement

---

## Standards & Conventions

### TDD Workflow: RED → GREEN → REFACTOR

1. **RED** — Write a failing test that describes the expected behavior
2. **GREEN** — Write the minimum code to make the test pass
3. **REFACTOR** — Clean up the code while keeping tests green

Do NOT write implementation first and tests after. Tests define the contract.

### Test Naming Convention

```
test_TASK###_[criterion description]
```

Examples:
- `test_TASK007_rejects_invalid_email_format`
- `test_TASK007_creates_user_with_valid_input`
- `test_TASK012_displays_loading_state_while_fetching`

### Test Structure: Arrange-Act-Assert (AAA)

```
// Arrange — set up test data and preconditions
// Act — execute the behavior being tested
// Assert — verify the expected outcome
```

Every test MUST have exactly one Act and clear Assertions. If you need multiple Acts, write multiple tests.

### Coverage Thresholds

| Type | Target |
|---|---|
| Unit tests | >= 80% line coverage |
| Integration tests | All API endpoints + error paths |
| E2E tests | All critical user flows from FRD |

### What to Test vs. What Not to Test

**Test:**
- Business logic and domain rules
- Input validation and error handling
- State transitions
- Edge cases (empty input, max length, boundary values)
- Integration points (API contracts, database queries)

**Don't test:**
- Framework internals (React rendering, Express routing)
- Third-party library behavior
- Getters/setters with no logic
- CSS styling (use visual regression tools instead)

---

## Implementation Checklist

- [ ] Tests exist for every acceptance criterion in the TASK entry
- [ ] Test names follow `test_TASK###_criterion` convention
- [ ] Tests follow AAA structure
- [ ] Each test is independent (no shared mutable state, no test ordering)
- [ ] Negative cases tested (invalid input, unauthorized access, not found)
- [ ] Edge cases tested (empty, null, max length, boundary values)
- [ ] No tests depend on external services (mock external APIs)
- [ ] Tests run in < 30 seconds (unit) or < 5 minutes (integration/e2e)
- [ ] No `console.log` or debugging artifacts in test code

---

## Code Patterns

### Unit Test — Jest/Vitest

```typescript
// Implements: TASK-### (FR-###) [SCR-###]

import { describe, it, expect, beforeEach } from "vitest";
import { UserService } from "../services/user.service.js";

describe("UserService.create", () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(mockDb);
  });

  it("test_TASK007_creates_user_with_valid_input", async () => {
    // Arrange
    const input = { name: "Alice", email: "alice@example.com", role: "user" };

    // Act
    const user = await service.create(input);

    // Assert
    expect(user.name).toBe("Alice");
    expect(user.email).toBe("alice@example.com");
    expect(user.id).toBeDefined();
  });

  it("test_TASK007_rejects_duplicate_email", async () => {
    // Arrange
    const input = { name: "Alice", email: "existing@example.com", role: "user" };
    mockDb.user.findUnique.mockResolvedValue({ id: 1, email: "existing@example.com" });

    // Act & Assert
    await expect(service.create(input)).rejects.toThrow("Email already registered");
  });

  it("test_TASK007_rejects_empty_name", async () => {
    // Arrange
    const input = { name: "", email: "alice@example.com", role: "user" };

    // Act & Assert
    await expect(service.create(input)).rejects.toThrow();
  });
});
```

### Integration Test — API Endpoint

```typescript
// Implements: TASK-### (FR-###) [SCR-###]

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { db } from "../db.js";

describe("POST /api/users", () => {
  let authToken: string;

  beforeAll(async () => {
    await db.migrate();
    authToken = await getTestToken("admin");
  });

  afterAll(async () => {
    await db.cleanup();
  });

  it("test_TASK007_returns_201_with_valid_input", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Alice", email: "alice@test.com", role: "user" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: "Alice",
      email: "alice@test.com",
    });
  });

  it("test_TASK007_returns_400_with_invalid_email", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Alice", email: "not-an-email", role: "user" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("test_TASK007_returns_401_without_auth", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Alice", email: "alice@test.com", role: "user" });

    expect(res.status).toBe(401);
  });
});
```

### Python Unit Test — pytest

```python
# Implements: TASK-### (FR-###) [SCR-###]

import pytest
from app.services.user import UserService


class TestUserServiceCreate:
    def test_TASK007_creates_user_with_valid_input(self, db_session):
        # Arrange
        service = UserService(db_session)
        payload = {"name": "Alice", "email": "alice@example.com", "role": "user"}

        # Act
        user = service.create(payload)

        # Assert
        assert user.name == "Alice"
        assert user.email == "alice@example.com"
        assert user.id is not None

    def test_TASK007_rejects_duplicate_email(self, db_session, existing_user):
        # Arrange
        service = UserService(db_session)
        payload = {"name": "Bob", "email": existing_user.email, "role": "user"}

        # Act & Assert
        with pytest.raises(ValueError, match="Email already registered"):
            service.create(payload)
```

### E2E Test — Playwright (Page Object Model)

```typescript
// Implements: TASK-### (FR-###) [SCR-###]

import { test, expect } from "@playwright/test";

// Page Object
class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Sign in" }).click();
  }

  async getErrorMessage() {
    return this.page.getByRole("alert").textContent();
  }
}

// Tests
test.describe("Login flow", () => {
  test("test_TASK003_successful_login_redirects_to_dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("admin@test.com", "password123");
    await expect(page).toHaveURL("/dashboard");
  });

  test("test_TASK003_invalid_credentials_shows_error", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("admin@test.com", "wrong-password");
    const error = await loginPage.getErrorMessage();
    expect(error).toContain("Invalid credentials");
  });
});
```

### Test Factory / Fixture

```typescript
// test/factories/user.factory.ts

import { faker } from "@faker-js/faker";
import type { User } from "../../src/models/user.model.js";

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}
```

---

## Quality Gates

1. **Coverage** — unit test coverage >= 80% (check with `--coverage` flag)
2. **Independence** — each test passes when run alone (`--only` flag)
3. **Speed** — unit suite < 30s, integration suite < 5m
4. **No flaky tests** — tests pass consistently on repeated runs
5. **Acceptance coverage** — every AC from the TASK entry has at least one test

---

## Common Pitfalls

- **Testing implementation, not behavior** — asserting internal method calls instead of observable outcomes.
- **Shared mutable state** — tests modify a shared object and affect each other. Use `beforeEach` to reset.
- **Over-mocking** — mocking everything makes tests pass even if the code is broken. Mock at boundaries only.
- **Missing negative tests** — only testing the happy path. Always test invalid input, unauthorized access, not found.
- **Fragile assertions** — `toEqual(exactObject)` breaks when unrelated fields change. Use `toMatchObject` for partial matches.
- **Sleep in tests** — `await sleep(1000)` makes tests slow and flaky. Use `waitFor` or polling assertions.
