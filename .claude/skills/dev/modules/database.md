# Module: Database — Schema, Migrations, Queries

## When This Module Applies

Use this module when implementing TASK-### entries involving:
- Database schema design from FRD entities (Section 5)
- Migration creation (up and down)
- Query optimization and indexing
- ORM model definitions (Prisma, SQLAlchemy, Django ORM, Drizzle)
- Data seeding and fixtures

---

## Standards & Conventions

### Schema Design from FRD

Map FRD Section 5 entities to database tables. Every entity gets standard CRUD + Soft Delete columns:

```sql
-- Standard columns for ALL tables:
id            -- Primary key (auto-increment integer or UUID per FRD §12.1)
created_at    -- Timestamp, NOT NULL, DEFAULT NOW()
updated_at    -- Timestamp, NOT NULL, DEFAULT NOW(), auto-update on modification
deleted_at    -- Timestamp, NULL (soft delete — NULL means active)
created_by    -- Foreign key to users table (audit trail)
updated_by    -- Foreign key to users table (audit trail)
```

**Soft Delete rule:** All queries MUST filter `WHERE deleted_at IS NULL` by default. Expose "include deleted" only for admin/audit views.

### Naming Conventions

- Tables: `snake_case`, plural — `user_profiles`, `order_items`
- Columns: `snake_case` — `first_name`, `created_at`
- Primary keys: `id`
- Foreign keys: `{referenced_table_singular}_id` — `user_id`, `order_id`
- Indexes: `idx_{table}_{columns}` — `idx_users_email`
- Unique constraints: `uq_{table}_{columns}` — `uq_users_email`
- Junction tables: `{table_a}_{table_b}` alphabetically — `roles_users`

### Migration Rules

1. Every migration MUST have both `up` and `down` operations
2. Migrations are immutable — never edit a migration that has been applied
3. One logical change per migration (don't mix schema and data changes)
4. Destructive operations (drop column/table) need a 2-step approach:
   - Step 1: Stop writing to the column/table, deploy
   - Step 2: Drop the column/table in a later migration

### Indexing Strategy

**Always index:**
- Foreign keys (most ORMs do this automatically — verify)
- Columns used in `WHERE` clauses frequently
- Columns used in `ORDER BY`
- Columns with unique constraints

**Consider composite indexes** when queries filter on multiple columns:
```sql
-- Query: WHERE user_id = ? AND status = ? ORDER BY created_at DESC
CREATE INDEX idx_orders_user_status_created ON orders(user_id, status, created_at DESC);
```

**Index order matters:** Put equality conditions first, then range/sort conditions.

---

## Implementation Checklist

- [ ] All FRD Section 5 entities mapped to tables
- [ ] Standard columns (id, created_at, updated_at, deleted_at, created_by, updated_by) on all tables
- [ ] Foreign keys have indexes
- [ ] Soft delete filter applied in all default queries
- [ ] Migration has both `up` and `down` operations
- [ ] Migration tested in both directions
- [ ] No raw SQL unless ORM can't express the query (document why)
- [ ] N+1 query patterns identified and resolved with eager loading
- [ ] Sensitive data columns identified (per FRD §12.4 security) — encrypted if required

---

## Code Patterns

### Prisma Schema

```prisma
// Implements: TASK-### (FR-###) [SCR-###]

model User {
  id        Int       @id @default(autoincrement())
  name      String    @db.VarChar(100)
  email     String    @unique
  role      Role      @default(USER)
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  createdBy Int?      @map("created_by")
  updatedBy Int?      @map("updated_by")

  orders    Order[]
  profile   UserProfile?

  @@map("users")
}

enum Role {
  ADMIN
  USER
  VIEWER
}
```

### Prisma Migration

```typescript
// Implements: TASK-### (FR-###) [SCR-###]

import { PrismaClient } from "@prisma/client";

// Up
export async function up(prisma: PrismaClient) {
  await prisma.$executeRaw`
    ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
  `;
}

// Down
export async function down(prisma: PrismaClient) {
  await prisma.$executeRaw`
    DROP INDEX IF EXISTS idx_users_phone;
    ALTER TABLE users DROP COLUMN IF EXISTS phone;
  `;
}
```

### Django Model with Soft Delete

```python
# Implements: TASK-### (FR-###) [SCR-###]

from django.db import models


class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "auth.User", null=True, on_delete=models.SET_NULL, related_name="+"
    )
    updated_by = models.ForeignKey(
        "auth.User", null=True, on_delete=models.SET_NULL, related_name="+"
    )

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def soft_delete(self):
        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])
```

### SQLAlchemy Model

```python
# Implements: TASK-### (FR-###) [SCR-###]

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    total = Column(Integer, nullable=False)  # Store in cents
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", lazy="selectin")

    __table_args__ = (
        Index("idx_orders_user_status", "user_id", "status"),
    )
```

### Query Optimization — N+1 Prevention

```typescript
// BAD: N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  const orders = await prisma.order.findMany({ where: { userId: user.id } }); // N queries!
}

// GOOD: Eager loading
const users = await prisma.user.findMany({
  include: { orders: true },  // 1 query with JOIN
});
```

---

## Quality Gates

1. **Schema completeness** — every FRD entity has a corresponding table with all standard columns
2. **Migration reversibility** — `down` migration tested and works
3. **No N+1 patterns** — all relationship access uses eager loading
4. **Index coverage** — `EXPLAIN ANALYZE` on key queries shows index usage
5. **Soft delete enforced** — default query scope excludes soft-deleted records

---

## Common Pitfalls

- **Missing indexes on foreign keys** — causes slow JOINs as the table grows.
- **Storing money as float** — use integer (cents) or `DECIMAL(10,2)`. Never `FLOAT`.
- **No down migration** — makes rollbacks impossible. Always write the reverse.
- **Hardcoded IDs in seeds** — use sequences or let the DB assign IDs.
- **Forgetting soft delete filter** — querying `SELECT * FROM users` without `WHERE deleted_at IS NULL`.
- **Over-indexing** — indexes speed up reads but slow writes. Only index what queries actually use.
