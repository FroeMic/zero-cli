# Deals

## Endpoints

```
GET    /api/deals
POST   /api/deals
GET    /api/deals/{dealId}
PATCH  /api/deals/{dealId}
DELETE /api/deals/{dealId}
```

## Schema Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | — |
| `workspaceId` | UUID | **Required for creation** |
| `pipelineId` | UUID | — |
| `companyId` | UUID | — |
| `contactIds` | UUID[] | Associated contacts |
| `name` | string | — |
| `stage` | UUID | Stage ID; defaults to workspace default if omitted |
| `value` | number | Monetary value |
| `confidence` | number | Win probability **0–1** (e.g., `0.75` = 75%) |
| `closeDate` | ISO 8601 | — |
| `startDate` | ISO 8601 | — |
| `endDate` | ISO 8601 | — |
| `listIds` | UUID[] | — |
| `ownerIds` | UUID[] | — |
| `custom` | object | Custom properties keyed by column UUID |
| `externalId` | string | — |
| `source` | string | — |
| `archived` | boolean | — |
| `createdAt` | ISO 8601 | — |
| `updatedAt` | ISO 8601 | — |
| `createdById` | UUID | — |

## CLI

```bash
zero-cli deals list --where '{"workspaceId":"<UUID>"}'
zero-cli deals get <dealId>
zero-cli deals create --workspaceId <UUID> --name "Big Deal" --value 50000
zero-cli deals update <dealId> --confidence 0.8
```
