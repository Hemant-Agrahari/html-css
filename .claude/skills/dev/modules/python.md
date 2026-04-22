# Module: Python — Django / FastAPI / Flask

## When This Module Applies

Use this module when implementing TASK-### entries involving:
- Python backend services
- Django (views, models, admin, middleware)
- FastAPI (routes, Pydantic models, dependency injection)
- Flask (blueprints, views)
- SQLAlchemy ORM
- Async/ASGI patterns

---

## Standards & Conventions

### Project Structure

**Django:**
```
project/
  manage.py
  config/
    settings.py
    urls.py
    wsgi.py / asgi.py
  apps/
    {app_name}/
      models.py
      views.py
      urls.py
      serializers.py    # DRF
      admin.py
      tests/
        test_models.py
        test_views.py
      migrations/
```

**FastAPI:**
```
project/
  main.py
  config.py
  routers/
    {domain}.py
  models/
    {domain}.py         # SQLAlchemy models
  schemas/
    {domain}.py         # Pydantic schemas
  services/
    {domain}.py         # Business logic
  dependencies.py
  tests/
    test_{domain}.py
```

### Naming Conventions

- Files/modules: `snake_case` — `user_service.py`
- Classes: `PascalCase` — `UserProfile`
- Functions/methods: `snake_case` — `get_user_by_id`
- Constants: `UPPER_SNAKE_CASE` — `MAX_LOGIN_ATTEMPTS`
- Private: prefix with `_` — `_validate_input`

### Type Hints

All function signatures MUST have type annotations:

```python
def get_user(user_id: int) -> User | None:
    ...

async def create_order(
    items: list[OrderItem],
    user: User,
    discount: Decimal = Decimal("0"),
) -> Order:
    ...
```

Use `from __future__ import annotations` for forward references.

### Virtual Environments

Always use a virtual environment. Document in project README:
```bash
python -m venv .venv
source .venv/bin/activate  # Unix
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

---

## Implementation Checklist

- [ ] All functions have type annotations (params + return)
- [ ] Pydantic models validate all API input (FastAPI) or DRF serializers (Django)
- [ ] Database queries use ORM — no raw SQL unless performance-critical (document why)
- [ ] Migrations are generated and tested (up AND down)
- [ ] Sensitive config read from environment variables, not hardcoded
- [ ] Async endpoints use `async def` with proper `await` (no blocking calls in async)
- [ ] Error responses use consistent format (status code, message, detail)
- [ ] Logging uses `logging` module with appropriate levels (not `print()`)
- [ ] No `import *` — explicit imports only

---

## Code Patterns

### FastAPI Route

```python
# Implements: TASK-### (FR-###) [SCR-###]

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services.user import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    service = UserService(db)
    user = await service.create(payload)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found",
        )
    return user
```

### Django View (DRF)

```python
# Implements: TASK-### (FR-###) [SCR-###]

from rest_framework import generics, permissions
from rest_framework.exceptions import NotFound

from .models import User
from .serializers import UserSerializer


class UserListCreateView(generics.ListCreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(is_active=True).select_related("profile")
```

### Pydantic Schema (FastAPI)

```python
# Implements: TASK-### (FR-###) [SCR-###]

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    role: str = Field(pattern=r"^(admin|user|viewer)$")


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

### Service Layer

```python
# Implements: TASK-### (FR-###) [SCR-###]

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, payload: UserCreate) -> User:
        user = User(**payload.model_dump())
        self._db.add(user)
        await self._db.commit()
        await self._db.refresh(user)
        return user

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self._db.execute(
            select(User).where(User.id == user_id, User.is_active.is_(True))
        )
        return result.scalar_one_or_none()
```

### Django Model

```python
# Implements: TASK-### (FR-###) [SCR-###]

from django.db import models


class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=[("admin", "Admin"), ("user", "User"), ("viewer", "Viewer")],
        default="user",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name
```

---

## Quality Gates

1. **No N+1 queries** — use `select_related` / `prefetch_related` (Django) or eager loading (SQLAlchemy)
2. **Input validation** — all API inputs validated via Pydantic/DRF serializers before reaching business logic
3. **No secrets in code** — all credentials via env vars or secret manager
4. **Async discipline** — no `time.sleep()` or synchronous I/O in async functions
5. **Migration safety** — every migration has a reverse operation; test both directions

---

## Common Pitfalls

- **Mixing sync and async** — calling `requests.get()` inside an `async def`. Use `httpx` for async HTTP.
- **Fat views** — business logic belongs in services, not in views/routes. Views handle HTTP; services handle domain logic.
- **Missing select_related** — accessing `user.profile.name` in a loop without eager loading. Produces N+1 queries.
- **Mutable default arguments** — `def f(items: list = [])` shares state between calls. Use `None` and create inside.
- **Bare except** — `except:` catches `SystemExit` and `KeyboardInterrupt`. Always catch specific exceptions.
- **print() debugging** — use `logging.getLogger(__name__)` instead of `print()`.
