# Workspaces

## Endpoint

```
GET /api/workspaces
```

Returns all workspaces the authenticated user belongs to. The workspace `id` is required by almost every other API call.

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Use this as `workspaceId` everywhere |
| `name` | string | Display name |
| `key` | string | Short key/slug |
| `domain` | string | Associated domain |
| `avatar` | string | URL |
| `color` | string | Theme color |
| `settings` | object | Workspace-level settings |
| `type` | string | Workspace type |
| `trialEndsAt` | ISO 8601 | — |
| `createdAt` | ISO 8601 | — |
| `updatedAt` | ISO 8601 | — |
| `archived` | boolean | — |

## CLI

```bash
zero-cli workspaces list
```
