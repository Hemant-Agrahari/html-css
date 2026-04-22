# Module: DevOps — CI/CD, Docker, Deployment

## When This Module Applies

Use this module when implementing TASK-### entries involving:
- CI/CD pipelines (GitHub Actions, GitLab CI)
- Dockerfiles and container configuration
- Deployment strategies (blue-green, canary, rolling)
- Environment configuration and secrets management
- Infrastructure as Code basics

---

## Standards & Conventions

### CI/CD Pipeline Structure

Every pipeline follows this stage order:

```
Install → Lint → Type Check → Unit Test → Build → Integration Test → Deploy
```

**Rules:**
- Pipeline MUST fail fast — lint and type check run before tests
- Tests run against the same Docker image that will be deployed
- Deployment requires all previous stages to pass
- Production deploys require manual approval

### Dockerfile Best Practices

1. **Multi-stage builds** — separate build dependencies from runtime
2. **Minimal base images** — `node:20-slim` not `node:20`, `python:3.12-slim` not `python:3.12`
3. **Non-root user** — never run as root in production
4. **Layer ordering** — copy dependency files first (for caching), then source code
5. **`.dockerignore`** — exclude `node_modules`, `.git`, test files, docs

### Environment Configuration

Three-tier config hierarchy:
1. **Defaults** — sensible defaults in code (dev-friendly)
2. **Environment variables** — override defaults per environment
3. **Secrets manager** — sensitive values (DB passwords, API keys, JWT secrets)

**Never:**
- Hardcode secrets in Dockerfiles, CI configs, or source code
- Commit `.env` files (add to `.gitignore`)
- Log secret values (even at debug level)

### Branch Strategy

```
main (production) ← PR with review
  └── develop (staging) ← PR with CI
        └── feature/TASK-### ← developer work
```

Branch naming: `feature/TASK-###-short-description`

---

## Implementation Checklist

- [ ] Dockerfile uses multi-stage build
- [ ] Dockerfile runs as non-root user
- [ ] `.dockerignore` excludes unnecessary files
- [ ] CI pipeline runs lint + type check + tests before deploy
- [ ] All secrets managed via environment variables or secrets manager
- [ ] No secrets in source code, Dockerfiles, or CI config files
- [ ] Health check endpoint exists (`/health` or `/healthz`)
- [ ] Graceful shutdown handles SIGTERM
- [ ] Deployment has rollback procedure documented
- [ ] Environment-specific configs separated (dev/staging/prod)

---

## Code Patterns

### Multi-Stage Dockerfile (Node.js)

```dockerfile
# Implements: TASK-### (FR-###) [SCR-###]

# Stage 1: Install dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-slim AS runtime
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
```

### Multi-Stage Dockerfile (Python)

```dockerfile
# Implements: TASK-### (FR-###) [SCR-###]

FROM python:3.12-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS runtime
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app

COPY --from=build /install /usr/local
COPY . .

USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
CMD ["gunicorn", "app.main:app", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

### GitHub Actions CI Pipeline

```yaml
# Implements: TASK-### (FR-###) [SCR-###]
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t app:${{ github.sha }} .

      - name: Integration tests
        run: |
          docker compose -f docker-compose.test.yml up -d
          npm run test:integration
          docker compose -f docker-compose.test.yml down

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: echo "Deploy to staging environment"

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - name: Deploy to production
        run: echo "Deploy to production environment"
```

### Docker Compose (Development)

```yaml
# Implements: TASK-### (FR-###) [SCR-###]
# docker-compose.yml

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://app:password@db:5432/appdb
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./src:/app/src  # Hot reload in development

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: password
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
```

### Health Check Endpoint

```typescript
// Implements: TASK-### (FR-###) [SCR-###]

import type { Request, Response } from "express";
import { db } from "../db.js";

export async function healthCheck(_req: Request, res: Response) {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? "unknown",
    });
  } catch {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## Quality Gates

1. **Build reproducibility** — `docker build` produces the same result from the same commit
2. **No secrets in image** — `docker history` shows no secrets in any layer
3. **Health check** — container reports healthy within 60s of startup
4. **Pipeline speed** — CI completes in < 10 minutes for PRs
5. **Rollback tested** — deployment can be rolled back to previous version

---

## Common Pitfalls

- **COPY . .** before dependency install — invalidates the Docker layer cache on every code change. Copy `package.json` first.
- **Running as root** — containers should use a non-root user for security.
- **Fat images** — using `node:20` (1GB) instead of `node:20-slim` (200MB). Use slim/alpine variants.
- **Secrets in ENV instructions** — `ENV JWT_SECRET=abc123` bakes the secret into the image layer. Use runtime env vars.
- **No health checks** — orchestrators can't tell if the app is ready. Always add a health endpoint.
- **Missing `.dockerignore`** — accidentally including `node_modules`, `.git`, or test files in the image.
