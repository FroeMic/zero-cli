# Companies

## Endpoints

```
GET    /api/companies
POST   /api/companies
GET    /api/companies/{companyId}
PATCH  /api/companies/{companyId}
DELETE /api/companies/{companyId}
```

## Schema Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | — |
| `workspaceId` | UUID | **Required for creation** |
| `name` | string | — |
| `domain` | string | — |
| `description` | string | — |
| `linkedin` | string | URL |
| `location` | object | `{ city, state, country, coordinates }` — NOT a string |
| `listIds` | UUID[] | List memberships |
| `ownerIds` | UUID[] | Owner user IDs |
| `parentCompanyId` | UUID | — |
| `custom` | object | Custom properties keyed by column UUID |
| `archived` | boolean | — |
| `createdAt` | ISO 8601 | — |
| `updatedAt` | ISO 8601 | — |

## CLI

```bash
zero-cli companies list --where '{"workspaceId":"<UUID>"}'
zero-cli companies get <companyId>
zero-cli companies create --workspaceId <UUID> --name "Acme Corp" --domain "acme.com"
zero-cli companies update <companyId> --name "New Name"
```
