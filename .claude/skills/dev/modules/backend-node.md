# Module: Backend — Node.js / Express / Fastify

## When This Module Applies

Use this module when implementing TASK-### entries involving:
- Express or Fastify HTTP servers
- REST API routes and middleware
- Request validation (Zod, Joi)
- Authentication (JWT, session, OAuth)
- Server-side business logic in Node.js/TypeScript

---

## Standards & Conventions

### Project Structure

```
src/
  index.ts              # Server bootstrap
  config.ts             # Environment config
  routes/
    {domain}.routes.ts  # Route definitions
  controllers/
    {domain}.controller.ts  # Request handling
  services/
    {domain}.service.ts     # Business logic
  models/
    {domain}.model.ts       # Database models / types
  middleware/
    auth.ts
    validate.ts
    error.ts
  utils/
    logger.ts
  types/
    index.ts
```

### Naming Conventions

- Files: `kebab-case` or `{name}.{layer}.ts` — `user.service.ts`
- Classes/interfaces: `PascalCase` — `UserService`, `CreateUserDto`
- Functions: `camelCase` — `getUserById`
- Constants: `UPPER_SNAKE_CASE` — `MAX_PAGE_SIZE`
- Route paths: `kebab-case` — `/api/user-profiles`

### Middleware Chain

Order matters. Standard chain:

```
Request → CORS → Body Parser → Rate Limiter → Auth → Validation → Controller → Error Handler → Response
```

### Environment Config

```typescript
// config.ts — Implements: TASK-### (FR-###) [SCR-###]

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export const config = envSchema.parse(process.env);
```

---

## Implementation Checklist

- [ ] All route inputs validated (params, query, body) before reaching controller
- [ ] Auth middleware protects all non-public routes
- [ ] Error handling middleware catches all errors and returns consistent format
- [ ] No secrets hardcoded — all from environment variables
- [ ] Database transactions used for multi-step mutations
- [ ] Pagination on all list endpoints (default + max page size)
- [ ] Request logging with correlation IDs
- [ ] Graceful shutdown handles in-flight requests
- [ ] TypeScript strict mode — no `any` without justification

---

## Code Patterns

### Express Route + Controller

```typescript
// Implements: TASK-### (FR-###) [SCR-###]

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { UserService } from "../services/user.service.js";

const router = Router();

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    role: z.enum(["admin", "user", "viewer"]),
  }),
});

router.post(
  "/users",
  authenticate,
  validate(createUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await UserService.create(req.body);
      res.status(201).json({ data: user });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/users/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await UserService.getById(Number(req.params.id));
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  },
);

export { router as userRoutes };
```

### Validation Middleware

```typescript
// Implements: TASK-### (FR-###) [SCR-###]

import type { Request, Response, NextFunction } from "express";
import type { AnyZodObject, ZodError } from "zod";

export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      const zodError = error as ZodError;
      res.status(400).json({
        error: "Validation failed",
        details: zodError.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }
  };
}
```

### Error Handling Middleware

```typescript
// Implements: TASK-### (FR-###) [SCR-###]

import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true,
  ) {
    super(message);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({
    error: "Internal server error",
  });
}
```

### Service Layer

```typescript
// Implements: TASK-### (FR-###) [SCR-###]

import { db } from "../db.js";
import { AppError } from "../middleware/error.js";
import type { CreateUserDto, User } from "../models/user.model.js";

export class UserService {
  static async create(data: CreateUserDto): Promise<User> {
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(409, "Email already registered");
    }
    return db.user.create({ data });
  }

  static async getById(id: number): Promise<User | null> {
    return db.user.findUnique({ where: { id } });
  }

  static async list(page = 1, limit = 20): Promise<{ users: User[]; total: number }> {
    const safeLimit = Math.min(limit, 100);
    const [users, total] = await Promise.all([
      db.user.findMany({
        skip: (page - 1) * safeLimit,
        take: safeLimit,
        orderBy: { createdAt: "desc" },
      }),
      db.user.count(),
    ]);
    return { users, total };
  }
}
```

### Auth Middleware (JWT)

```typescript
// Implements: TASK-### (FR-###) [SCR-###]

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { AppError } from "./error.js";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Authentication required");
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.JWT_SECRET) as { sub: number; role: string };
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}
```

---

## Quality Gates

1. **Input validation** — every route validates params, query, and body before processing
2. **Error consistency** — all errors return `{ error: string, details?: any }` format
3. **No unhandled promises** — all async route handlers wrapped in try/catch or use express-async-errors
4. **Transaction safety** — multi-step mutations use database transactions
5. **Auth coverage** — no protected route accessible without authentication middleware

---

## Common Pitfalls

- **Missing `next(error)`** — forgetting to forward errors to the error handler in async routes.
- **Blocking the event loop** — synchronous file I/O, CPU-heavy computation, or `JSON.parse` on large payloads. Use streams or worker threads.
- **Leaking stack traces** — sending `err.stack` in production responses. Only log it server-side.
- **Missing pagination** — returning all records without limit. Always paginate list endpoints.
- **Trusting client input** — using `req.body.role` to set permissions without server-side validation.
- **Circular dependencies** — service A imports service B and vice versa. Use dependency injection.
