# Contacts

## Endpoints

```
GET    /api/contacts
POST   /api/contacts
GET    /api/contacts/{contactId}
PATCH  /api/contacts/{contactId}
DELETE /api/contacts/{contactId}
```

## Schema Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | — |
| `workspaceId` | UUID | **Required for creation** |
| `companyId` | UUID | Auto-resolved if email/LinkedIn is provided |
| `name` | string | — |
| `email` | string | — |
| `title` | string | Job title |
| `phone` | string | — |
| `linkedin` | string | URL |
| `x` | string | Twitter/X handle |
| `facebook` | string | — |
| `github` | string | — |
| `avatar` | string | URL |
| `location` | object | `{ city, state, country, coordinates }` |
| `type` | string | — |
| `custom` | object | Custom properties keyed by column UUID |
| `listIds` | UUID[] | List memberships |
| `ownerIds` | UUID[] | Owner user IDs |
| `externalId` | string | Your external ID for sync |
| `source` | string | — |
| `archived` | boolean | — |
| `createdAt` | ISO 8601 | — |
| `updatedAt` | ISO 8601 | — |
| `createdById` | UUID | — |

## CLI

```bash
zero-cli contacts list --where '{"workspaceId":"<UUID>"}'
zero-cli contacts get <contactId>
zero-cli contacts create --workspaceId <UUID> --name "Jane Doe" --email "jane@acme.com"
zero-cli contacts update <contactId> --title "VP Sales"
```
