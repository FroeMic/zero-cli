# Zero API Overview

**Base URL:** `https://api.zero.inc`
**Version:** Beta 1.3 / v1.4.0

The Zero API is a REST API for the Zero CRM platform. All requests require a Bearer token and most require a `workspaceId`.

---

## Quick Start

1. **Authenticate** — include `Authorization: Bearer <token>` on every request.
2. **Get your workspace** — call `GET /api/workspaces` and note the `id` field.
3. **Use your workspace ID** — pass it as `workspaceId` in all subsequent requests.

See [authentication.md](./authentication.md) for full details.

---

## Resources

| Resource | Path | Description |
|----------|------|-------------|
| Workspaces | `/api/workspaces` | Workspace discovery — start here |
| Columns | `/api/columns` | Custom property definitions (select options, field types) |
| Companies | `/api/companies` | Company records |
| Contacts | `/api/contacts` | Contact records |
| Deals | `/api/deals` | Deal/opportunity records |
| Notes | `/api/notes` | Notes attached to companies/contacts/deals |
| Tasks | `/api/tasks` | Tasks with assignees and deadlines |

Detailed docs: [workspaces.md](./workspaces.md) · [columns.md](./columns.md) · [companies.md](./companies.md) · [contacts.md](./contacts.md) · [deals.md](./deals.md) · [notes.md](./notes.md) · [tasks.md](./tasks.md)

---

## Common Patterns

### Listing & Filtering

All list endpoints accept:

| Parameter | Type | Description |
|-----------|------|-------------|
| `fields` | string | Comma-separated field selection, supports dot-notation (`company.name`) |
| `where` | JSON | Filter object — see [filtering.md](./filtering.md) |
| `limit` | number | Max records (default 100) |
| `offset` | number | Pagination offset |
| `orderBy` | JSON | Sort definition |

### Response Format

```json
{ "data": [...], "total": 100 }     // list
{ "data": { ... } }                  // single record
```

Not-found returns HTTP 200 with `{}`.

### Custom Properties

Custom properties live inside a `custom` object keyed by **column UUID**:
```json
{ "custom": { "54e1ca7d-...": "some-option-key-uuid" } }
```

Always fetch `GET /api/columns` first to resolve UUIDs to human-readable names and option values.
See [columns.md](./columns.md) for details.

### Deletion

All entities support two modes:
- `DELETE /api/{entity}/{id}` — hard delete, returns `1`
- `DELETE /api/{entity}/{id}?archive=true` — soft delete, returns archived object

---

## Key Gotchas

1. **Select values are UUIDs** — when filtering or writing to `select`/`multiselect` columns, use the option's `key` UUID, not its display name.
2. **PATCH custom fields** — never send the entire `custom` object on PATCH; use dot-notation: `{ "custom.<COLUMN_UUID>": value }`.
3. **Task array fields replace, not merge** — `contactIds`, `companyIds`, `dealIds`, `assignedToIds` are fully replaced on PATCH.
4. **Location is a structured object** — `{ city, state, country, coordinates }`, not a string.
5. **Deal confidence is 0–1** — `0.75` means 75%.
6. **Rich content uses Tiptap** — notes and task descriptions use the Tiptap document format.
