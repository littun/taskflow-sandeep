## TaskFlow — Frontend Assignment

> **Applicant:** Sandeep Kumar Sahoo  
> **Role:** Frontend Engineer  
> **Stack:** React 19 + TypeScript + Vite · MSW (Mock Service Worker) · @dnd-kit · date-fns · React Router v6

---

### 1. Overview

**TaskFlow** is a minimal but fully-functional task management UI. Users can:

- Register / log in (JWT stored in `localStorage`)
- Create, edit, and delete projects
- Add tasks to projects with title, description, status, priority, assignee, and due date
- Drag and drop tasks between Kanban columns (`todo → in_progress → done`) with **optimistic UI** — the status updates instantly and reverts automatically if the API call fails
- Filter tasks by status and assignee
- Toggle between **dark mode and light mode** (persists across sessions)

Since this is a Frontend-only submission, the "backend" is a fully in-memory mock using **MSW (Mock Service Worker)** that intercepts all `http://localhost:4000/*` requests. No server is needed.

---

### 2. Architecture Decisions

| Decision | Rationale |
|---|---|
| **MSW over json-server** | MSW intercepts at the Service Worker level — no separate process, no CORS issues, full request/response control. Realistic network boundary with zero runtime cost. |
| **Custom CSS design system** | Avoids shipping a heavy UI library for an assignment. All tokens, themes, and components are hand-crafted and consistent. Dark/light mode is handled via `data-theme` on `<html>`. |
| **@dnd-kit** | More modern and accessible than react-beautiful-dnd (which is deprecated). Uses `PointerSensor` with a 6px activation distance to avoid accidental drags on click. |
| **Optimistic UI** | Task status changes apply immediately in local state. If the PATCH fails, the previous state is restored and a toast error is shown. This keeps the UI snappy. |
| **Context over Redux** | Three small contexts (Auth, Theme, Toast) are enough for this scope. No need for a global store — prop-drilling is minimal and state lives close to where it's used. |
| **date-fns over moment** | Tree-shakeable, modern, and actively maintained. Used for due-date formatting and overdue detection. |

**Intentionally left out:**
- Real backend / database (not required for Frontend role)
- Pagination (low priority for assignment scope)
- WebSocket real-time updates (bonus only, not attempted)
- Unit/integration tests (would add with more time — see section 7)

---

### 3. Running Locally

> Assumes: Node.js ≥ 18, npm ≥ 9. Docker is **not** needed for the frontend-only submission.

```bash
git clone https://github.com/sandeepkumarsahoo/taskflow-sandeep
cd taskflow-sandeep
npm install
npm run dev
# App available at http://localhost:5173
```

> MSW automatically registers a service worker that intercepts all mock API calls. You will see `[MSW] Mocking enabled` in the browser console.

---

### 4. Running Migrations

_Not applicable — this is a frontend-only submission. All data is seeded in memory via `src/mocks/db.ts` and resets on page reload._

Seed data includes:
- 1 project: **"Website Redesign"**
- 3 tasks with statuses: `todo`, `in_progress`, `done`

---

### 5. Test Credentials

```
Email:    test@example.com
Password: password123
```

A **"Use test credentials"** button on the login page fills these in automatically.

---

### 6. API Reference

All requests are intercepted by MSW and handled in `src/mocks/handlers.ts`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Register — returns `{ token, user }` |
| POST | `/auth/login` | ❌ | Login — returns `{ token, user }` |
| GET | `/projects` | ✅ | List user's projects |
| POST | `/projects` | ✅ | Create project |
| GET | `/projects/:id` | ✅ | Project detail + tasks |
| PATCH | `/projects/:id` | ✅ | Update name/description |
| DELETE | `/projects/:id` | ✅ | Delete project + all tasks |
| GET | `/projects/:id/tasks` | ✅ | List tasks (supports `?status=` `?assignee=`) |
| POST | `/projects/:id/tasks` | ✅ | Create task |
| PATCH | `/tasks/:id` | ✅ | Update task fields |
| DELETE | `/tasks/:id` | ✅ | Delete task |

Error shape:
```json
{ "error": "validation failed", "fields": { "email": "is required" } }
```

---

### 7. What I'd Do With More Time

1. **Tests** — Vitest + React Testing Library: auth flow, drag-and-drop status changes, optimistic revert behaviour
2. **Pagination** — virtual scrolling for projects/task lists at scale
3. **Search** — global task search with keyboard shortcut
4. **Real-time** — task updates via WebSocket (would need a real backend)
5. **Richer permissions** — right now all authenticated users can edit any project in the mock; real auth would scope this properly
6. **Keyboard accessibility** — full `aria-*` audit, focus trapping in modals, drag-and-drop keyboard support via @dnd-kit's keyboard sensor
7. **Transition animations** — FLIP animations on task card moves between columns

---

### Project Structure

```
src/
├── mocks/
│   ├── db.ts          # In-memory database with seed data
│   ├── handlers.ts    # MSW request handlers (all 11 endpoints)
│   └── browser.ts     # MSW worker setup
├── types/
│   └── index.ts       # Shared TypeScript types
├── context/
│   ├── AuthContext.tsx     # JWT auth + localStorage persistence
│   ├── ThemeContext.tsx    # Dark/light mode toggle
│   └── ToastContext.tsx    # Toast notification system
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx        # Sticky nav with user avatar + theme toggle
│   │   ├── AppLayout.tsx     # Main layout wrapper
│   │   └── ProtectedRoute.tsx
│   ├── projects/
│   │   └── ProjectModal.tsx  # Create/edit project modal
│   └── tasks/
│       ├── TaskCard.tsx      # Draggable task card
│       ├── TaskModal.tsx     # Create/edit task modal
│       └── KanbanColumn.tsx  # Droppable column
├── pages/
│   ├── LoginPage.tsx         # Login + Register (single page, animated)
│   ├── ProjectsPage.tsx      # Projects grid with CRUD
│   └── ProjectDetailPage.tsx # Kanban board with DnD
├── index.css          # Complete design system (tokens, dark/light themes, components)
└── main.tsx           # Entry — starts MSW before mounting React
```
