# Module: Frontend — React / Next.js

## When This Module Applies

Use this module when implementing TASK-### entries involving:
- React components (functional components with hooks)
- Next.js App Router (server/client components, layouts, pages)
- State management (useState, useReducer, Zustand, Context)
- Data fetching (SWR, React Query, Server Actions)
- UI component libraries (shadcn/ui, Radix)

---

## Standards & Conventions

### Component Architecture

**Server Components (default in Next.js App Router):**
- No `"use client"` directive — runs on the server
- Can `await` async data directly
- Cannot use hooks, event handlers, or browser APIs
- Use for: data fetching, static content, layouts

**Client Components:**
- Add `"use client"` at the top of the file
- Can use hooks, event handlers, browser APIs
- Use for: interactive UI, forms, state-dependent rendering
- Keep client components small — push data fetching to server components

**Component file structure:**
```
components/
  Button/
    Button.tsx          # Component implementation
    Button.test.tsx     # Tests (if using testing module)
    index.ts            # Re-export
  LoginForm/
    LoginForm.tsx
    LoginForm.test.tsx
    index.ts
```

### Naming Conventions

- Components: `PascalCase` — `UserProfile.tsx`
- Hooks: `camelCase` with `use` prefix — `useAuth.ts`
- Utilities: `camelCase` — `formatDate.ts`
- Constants: `UPPER_SNAKE_CASE` — `MAX_RETRIES`
- Props interfaces: `{ComponentName}Props` — `UserProfileProps`
- Event handlers: `handle{Event}` — `handleSubmit`, `handleClick`

### State Management Hierarchy

Use the simplest option that works:

1. **Local state** (`useState`) — component-scoped, ephemeral
2. **Derived state** — compute from existing state, don't store separately
3. **Lifted state** — share between siblings via parent
4. **Context** (`useContext`) — theme, auth, locale (infrequently changing)
5. **Zustand/Jotai** — complex client state shared across many components
6. **Server state** (SWR/React Query) — data from APIs, cached and revalidated

**Rule:** Don't reach for a state library until `useState` + `useContext` prove insufficient.

### Data Fetching

**Next.js App Router (preferred):**
```tsx
// Server Component — fetch directly
async function UserList() {
  const users = await db.users.findMany();
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

**Client-side (SWR):**
```tsx
"use client";
import useSWR from "swr";

function UserList() {
  const { data, error, isLoading } = useSWR("/api/users", fetcher);
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

**Server Actions (mutations):**
```tsx
// actions.ts
"use server";
export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  await db.users.create({ data: { name } });
  revalidatePath("/users");
}
```

---

## Implementation Checklist

- [ ] Components are pure functions (same props → same output)
- [ ] Server vs. client boundary is intentional (`"use client"` only where needed)
- [ ] All list renders use stable `key` props (not array index for dynamic lists)
- [ ] Error boundaries wrap sections that can fail
- [ ] Loading states handled (skeleton, spinner, or suspense boundary)
- [ ] Empty states handled (no data → helpful message, not blank screen)
- [ ] Forms validate input before submission
- [ ] Event handlers don't cause unnecessary re-renders
- [ ] Side effects are in `useEffect` with proper dependency arrays
- [ ] No direct DOM manipulation (use refs only when necessary)
- [ ] TypeScript types for all props (no `any`)
- [ ] Accessible: semantic HTML, ARIA where needed, keyboard support

---

## Code Patterns

### Basic Component

```tsx
// Implements: TASK-### (FR-###) [SCR-###]

interface UserCardProps {
  name: string;
  email: string;
  role: "admin" | "user";
  onEdit: (email: string) => void;
}

export function UserCard({ name, email, role, onEdit }: UserCardProps) {
  return (
    <article className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="text-sm text-gray-600">{email}</p>
      <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs">
        {role}
      </span>
      <button
        onClick={() => onEdit(email)}
        className="mt-2 text-sm text-blue-600 hover:underline"
      >
        Edit
      </button>
    </article>
  );
}
```

### Form with Validation

```tsx
// Implements: TASK-### (FR-###) [SCR-###]
"use client";

import { useActionState } from "react";
import { createUser } from "./actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, null);

  return (
    <form action={action}>
      <label htmlFor="name">Name</label>
      <input id="name" name="name" required minLength={2} />
      {state?.errors?.name && (
        <p role="alert" className="text-sm text-red-600">{state.errors.name}</p>
      )}

      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required />
      {state?.errors?.email && (
        <p role="alert" className="text-sm text-red-600">{state.errors.email}</p>
      )}

      <button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
```

### Error Boundary

```tsx
// Implements: TASK-### (FR-###) [SCR-###]
"use client";

import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert" className="rounded-md bg-red-50 p-4">
          <p className="text-red-800">Something went wrong. Please try again.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Custom Hook

```tsx
// Implements: TASK-### (FR-###) [SCR-###]
"use client";

import { useState, useCallback } from "react";

export function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle];
}
```

---

## Quality Gates

1. **No prop drilling > 2 levels** — use Context or composition instead
2. **No inline object/array creation in JSX** — causes unnecessary re-renders
3. **All async operations handle loading + error + empty states**
4. **TypeScript strict mode** — no `any`, no `@ts-ignore` without justification
5. **Bundle impact** — new dependencies must be justified (check bundle size)

---

## Common Pitfalls

- **useEffect for derived state** — if you can compute it from props/state, do it during render, not in an effect.
- **Missing dependency arrays** — every variable used inside `useEffect` must be in the dependency array.
- **Fetching in useEffect** — prefer server components or SWR/React Query over `useEffect` + `fetch`.
- **Over-splitting components** — don't create a component for every 3 lines of JSX. Split when there's a reuse case or a clear boundary.
- **Client components for static content** — if a component doesn't need interactivity, keep it as a server component.
- **Key as index** — only use array index as `key` when the list is static and never reordered.
