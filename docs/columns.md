# Columns (Custom Property Definitions)

## Endpoint

```
GET /api/columns
```

Returns all custom property definitions. **Fetch this before working with custom properties** — you need column IDs to filter/update and option `key` UUIDs to set select values.

## Recommended Filter

```bash
GET /api/columns?where={"workspaceId":"<UUID>"}
```

## Column Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Use this as the key in `custom.<id>` |
| `name` | string | Human-readable name |
| `type` | string | See column types below |
| `entity` | string | `companies`, `contacts`, or `deals` |
| `options` | array | For `select`/`multiselect` — see option schema |
| `key` | string | Short identifier |
| `description` | string | — |
| `ai` | boolean | AI-generated field |
| `archived` | boolean | — |

## Column Types

`text` · `richtext` · `number` · `currency` · `date` · `timestamp` · `select` · `multiselect` · `boolean` · `url` · `email` · `phone` · `user` · `company` · `companies` · `contact` · `contacts`

## Select/Multiselect Options

Each option object:

```json
{
  "key": "a1b2c3d4-...",   // UUID — use this when filtering or writing
  "name": "Active",         // Human-readable — use this for display
  "color": "#00ff00"
}
```

**Always use `key` (UUID) when filtering or writing. Use `name` for display.**

## Working With Custom Properties

### Reading (enriched by CLI)

The `custom` object in API responses uses column UUIDs as keys and option key UUIDs as values:

```json
{
  "custom": {
    "54e1ca7d-69c3-4b77-8266-8085b5834116": "opt-key-uuid"
  }
}
```

Run `zero-cli columns sync` to cache this mapping locally. The CLI will then automatically resolve UUIDs to names.

### Filtering

```json
{ "custom.54e1ca7d-...": { "$in": ["<OPTION_KEY_UUID>"] } }
```

### Updating (PATCH)

Use dot-notation — **never** pass the full `custom` object as it overwrites all existing values:

```json
{ "custom.54e1ca7d-...": "<OPTION_KEY_UUID>" }
```

## CLI

```bash
# List all column definitions
zero-cli columns list

# Sync definitions to local cache (enables enrichment)
zero-cli columns sync
```
