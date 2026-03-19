# Tasks

## Endpoints

```
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/{taskId}
PATCH  /api/tasks/{taskId}
DELETE /api/tasks/{taskId}
```

## Schema Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | — |
| `workspaceId` | UUID | **Required for creation** |
| `name` | string | **Required for creation** |
| `done` | boolean | Completion status |
| `deadline` | ISO 8601 | Nullable |
| `priority` | number | `null` · `1` (Low) · `2` (Medium) · `3` (High) · `4` (Urgent) |
| `content` | Tiptap doc | Task title as rich text (auto-generated from `name` if omitted) |
| `description` | Tiptap doc | Extended notes |
| `companyIds` | UUID[] | ⚠️ Fully replaced on PATCH |
| `contactIds` | UUID[] | ⚠️ Fully replaced on PATCH |
| `dealIds` | UUID[] | ⚠️ Fully replaced on PATCH |
| `assignedToIds` | UUID[] | ⚠️ Fully replaced on PATCH |
| `type` | string | Set by integrations — do not set manually |
| `archived` | boolean | — |
| `createdAt` | ISO 8601 | — |
| `updatedAt` | ISO 8601 | — |
| `createdById` | UUID | — |
| `externalId` | string | — |
| `source` | string | — |

## Priority Values

| Value | Meaning |
|-------|---------|
| `null` | No priority |
| `1` | Low |
| `2` | Medium |
| `3` | High |
| `4` | Urgent |

## Array Field Warning

`contactIds`, `companyIds`, `dealIds`, and `assignedToIds` are **fully replaced** on PATCH — they are not merged. Always send the complete desired array.

```bash
# Add a contact to a task — must include all existing contactIds
zero-cli tasks update <taskId> --contactIds '["existing-uuid","new-uuid"]'
```

## CLI

```bash
zero-cli tasks list --where '{"workspaceId":"<UUID>","done":false}'
zero-cli tasks get <taskId>
zero-cli tasks create --workspaceId <UUID> --name "Follow up with Jane"
zero-cli tasks update <taskId> --done true
```
