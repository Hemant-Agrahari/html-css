# Module: Code Review — Review & Refactoring

## When This Module Applies

Use this module when implementing TASK-### entries involving:
- Code review against requirements (FR-### spec)
- Pull request reviews
- Refactoring existing code
- SOLID principle compliance
- Security quick scan (OWASP basics)

---

## Standards & Conventions

### Review Scope

Every code review checks these dimensions in order:

1. **Correctness** — Does the code implement what the TASK-### specifies?
2. **Security** — OWASP quick scan (injection, auth, data exposure)
3. **Performance** — N+1 queries, unnecessary re-renders, missing pagination
4. **Maintainability** — SOLID principles, naming, complexity
5. **Traceability** — traceability headers present, FR-### references accurate

### Severity Classification

| Severity | Meaning | Action |
|---|---|---|
| **CRITICAL** | Security vulnerability, data loss risk, or crash | Must fix before merge |
| **HIGH** | Logic error, missing requirement, performance issue | Must fix before merge |
| **MEDIUM** | Code smell, maintainability concern, missing edge case | Should fix, discuss if blocking |
| **LOW** | Style preference, naming suggestion, minor improvement | Optional, author's discretion |
| **NIT** | Trivial nitpick | Never block merge |

### SOLID Checklist

- **S** — Single Responsibility: Does each class/module have one reason to change?
- **O** — Open/Closed: Can behavior be extended without modifying existing code?
- **L** — Liskov Substitution: Can subtypes be used interchangeably with their base type?
- **I** — Interface Segregation: Are interfaces focused (no unused methods forced on implementors)?
- **D** — Dependency Inversion: Do high-level modules depend on abstractions, not concrete implementations?

### OWASP Quick Scan

Check for these top risks in every review:

1. **Injection** — user input used directly in SQL, shell commands, or templates?
2. **Broken auth** — auth checks on every protected route? Token validated server-side?
3. **Sensitive data exposure** — passwords hashed? PII logged? Secrets in code?
4. **Broken access control** — can user A access user B's data? Role checks enforced?
5. **Security misconfiguration** — CORS wide open? Debug mode in production? Default credentials?

---

## Implementation Checklist

- [ ] Every finding has a severity classification
- [ ] CRITICAL/HIGH findings have specific fix suggestions
- [ ] Review covers all 5 dimensions (correctness, security, performance, maintainability, traceability)
- [ ] Review references specific lines/files, not vague comments
- [ ] Positive feedback included (not just problems)
- [ ] PR template links to TASK-### and includes test evidence

---

## Code Patterns

### Review Report Format

```markdown
## Code Review: TASK-### — [Task Title]

**Reviewer:** [Agent/Human]
**Files reviewed:** [list of files]
**Overall assessment:** APPROVE / REQUEST CHANGES / COMMENT

### Findings

#### [CRITICAL] SQL Injection in user search — `src/routes/users.ts:45`
The search query interpolates user input directly:
```typescript
// CURRENT (vulnerable)
const query = `SELECT * FROM users WHERE name LIKE '%${req.query.search}%'`;

// FIX: Use parameterized query
const users = await db.user.findMany({
  where: { name: { contains: req.query.search } },
});
```

#### [HIGH] Missing auth on admin endpoint — `src/routes/admin.ts:12`
The `/admin/users` endpoint has no `authenticate` middleware.

#### [MEDIUM] N+1 query in order list — `src/services/order.service.ts:28`
`orders.map(o => o.user)` triggers a query per order. Use eager loading.

#### [LOW] Variable naming — `src/utils/helpers.ts:5`
`const d = new Date()` — prefer descriptive name like `const now = new Date()`.

#### [NIT] Trailing whitespace — `src/config.ts:12`

### What's Good
- Clean separation between route and service layers
- Comprehensive input validation with Zod
- All acceptance criteria from TASK-### covered
```

### PR Template

```markdown
## TASK-### — [Task Title]

**Requirement:** FR-### — [requirement title]
**Screen:** SCR-### — [screen name]

### Changes
- [What changed and why]

### Testing
- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] Manual verification against SCR-### wireframe

### Acceptance Criteria
- [x] AC-1: [criterion] — verified by test_TASK###_criterion_1
- [x] AC-2: [criterion] — verified by test_TASK###_criterion_2

### Screenshots / Evidence
[If UI changes, include before/after screenshots]
```

### Refactoring: Extract Function

```typescript
// BEFORE — too much in one function
async function handleOrder(req: Request, res: Response) {
  const items = req.body.items;
  let total = 0;
  for (const item of items) {
    const product = await db.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new AppError(404, `Product ${item.productId} not found`);
    if (product.stock < item.quantity) throw new AppError(400, "Insufficient stock");
    total += product.price * item.quantity;
  }
  const order = await db.order.create({ data: { userId: req.userId, total, items: { create: items } } });
  res.status(201).json({ data: order });
}

// AFTER — extracted into focused functions
async function handleOrder(req: Request, res: Response) {
  const validatedItems = await validateOrderItems(req.body.items);
  const total = calculateOrderTotal(validatedItems);
  const order = await createOrder(req.userId, validatedItems, total);
  res.status(201).json({ data: order });
}
```

### Refactoring: Replace Conditional with Polymorphism

```typescript
// BEFORE — switch statement that grows with each new type
function calculateShipping(order: Order): number {
  switch (order.shippingMethod) {
    case "standard": return order.weight * 0.5;
    case "express": return order.weight * 1.5 + 10;
    case "overnight": return order.weight * 3.0 + 25;
    default: throw new Error("Unknown shipping method");
  }
}

// AFTER — strategy pattern
interface ShippingStrategy {
  calculate(weight: number): number;
}

const shippingStrategies: Record<string, ShippingStrategy> = {
  standard: { calculate: (w) => w * 0.5 },
  express: { calculate: (w) => w * 1.5 + 10 },
  overnight: { calculate: (w) => w * 3.0 + 25 },
};

function calculateShipping(order: Order): number {
  const strategy = shippingStrategies[order.shippingMethod];
  if (!strategy) throw new Error(`Unknown shipping method: ${order.shippingMethod}`);
  return strategy.calculate(order.weight);
}
```

---

## Quality Gates

1. **No CRITICAL/HIGH findings** — all must be resolved before merge
2. **OWASP quick scan clean** — no injection, broken auth, or data exposure
3. **N+1 check** — no unresolved N+1 query patterns
4. **Traceability intact** — every file has correct TASK-### header
5. **Tests pass** — all existing + new tests green

---

## Common Pitfalls

- **Review scope creep** — reviewing style while a security issue exists. Prioritize by severity.
- **Blocking on NITs** — never block a PR merge over a style preference.
- **Vague feedback** — "this could be better" without saying how. Always provide specific alternatives.
- **Missing positive feedback** — only pointing out problems is demoralizing. Acknowledge good patterns.
- **Reviewing too much at once** — PRs over 400 lines get superficial reviews. Request smaller PRs.
- **Over-abstracting during refactor** — extracting a helper used once. Only abstract when there's reuse.
