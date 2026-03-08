# Admin Panel Design

## Context

HaloDuo needs an admin panel for the app creator to monitor usage, manage users, and manage couples. Currently only a header-key-based RAG indexation endpoint exists.

## Requirements

1. **Dashboard stats** — users count, active couples, today's journals, premium subscribers
2. **User management** — list, change plan manually, delete
3. **Couple management** — list with details, re-trigger RAG indexation

## Design Decisions

- **Access**: Route `/admin` in the same app, protected by `is_admin` boolean on user
- **Auth**: `is_admin` column on `users` table, loaded in auth middleware, checked by `adminOnly` middleware
- **No role system**: Single boolean flag, no permissions matrix
- **Style**: Same crème/doré design as the main app

## Database

```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
```

Promote manually: `UPDATE users SET is_admin = true WHERE email = 'your@email.com';`

## Backend

### Middleware

- Modify `auth.js` to load `is_admin` from users table and include in `req.user`
- New `adminOnly` middleware: checks `req.user.is_admin`, returns 403 if false

### Routes (`/api/admin/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stats` | GET | User count, couple count, today's journals, premium count |
| `/users` | GET | Paginated user list (email, nom, plan, couple, created_at) |
| `/users/:id` | PATCH | Update user plan |
| `/users/:id` | DELETE | Delete user |
| `/couples` | GET | Couple list (members, cadre, created_at, journal count) |
| `/couples/:id/indexer` | POST | Re-trigger RAG indexation for a couple |

Existing `POST /indexer` and `POST /indexer/:coupleId` routes are absorbed into this file.

## Frontend

### Route structure

- `/admin` — Dashboard with 4 stat cards
- `/admin/utilisateurs` — Users table with actions
- `/admin/couples` — Couples table with actions

### Navigation

- If `user.is_admin`, Nav shows an "Admin" link (gear icon)
- Admin pages have tab navigation between the 3 sections

### Pages

**Dashboard** (`/admin`): 4 cards showing key metrics. Crème/doré style.

**Utilisateurs** (`/admin/utilisateurs`): Table with columns: nom, email, plan, couple, inscrit le. Actions: change plan (dropdown), delete (with confirmation modal).

**Couples** (`/admin/couples`): Table with columns: members, cadre éthique, créé le, nb journaux. Action: "Re-indexer RAG" button.
