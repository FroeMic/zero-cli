# Zero CLI

A command-line interface for [Zero CRM](https://zero.inc) that turns raw API responses into clean, human-readable output. Custom property UUIDs, select options, owner IDs, deal stages, and more are automatically resolved to their display names.

Built on top of the Zero OpenAPI spec using [specli](https://github.com/vercel-labs/specli).

## Installation

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Build from source

```bash
git clone https://github.com/<your-org>/zero-cli.git
cd zero-cli
bun install
bun run build
```

This produces two binaries in `./bin/`:
- `zero-cli-raw` — auto-generated from the OpenAPI spec (raw API access)
- `zero-cli` — wrapper that adds enrichment, caching, and config commands

Add `./bin` to your `PATH`, or copy the binaries:

```bash
# Option A: add to PATH
export PATH="$PWD/bin:$PATH"

# Option B: copy to a directory already in PATH
cp ./bin/zero-cli ./bin/zero-cli-raw /usr/local/bin/
```

Both binaries must be in the same directory.

---

## Authentication

You need a Zero API token. Contact the Zero team to obtain one.

### Store token (recommended)

```bash
zero-cli login <YOUR_API_TOKEN>
```

The token is saved locally and used for all subsequent commands. To verify:

```bash
zero-cli whoami
```

To clear the stored token:

```bash
zero-cli logout
```

### Per-command token

Pass the token directly to any command:

```bash
zero-cli contacts list --bearer-token <YOUR_API_TOKEN>
```

---

## Getting Started

### 1. Find your workspace

```bash
zero-cli workspaces list
```

Note the `id` field — you'll use it as `workspaceId` in filters.

### 2. Sync workspace configuration

This caches column definitions, user names, list names, and deal stages locally so UUIDs in API responses are resolved to readable names:

```bash
zero-cli columns sync
```

### 3. Query your data

```bash
zero-cli contacts list --where '{"workspaceId": "<WORKSPACE_ID>"}' --hide-nulls
```

---

## Usage

### Reading data

#### List records

```bash
zero-cli contacts list
zero-cli companies list
zero-cli deals list
zero-cli notes list
zero-cli tasks list
```

#### Get a single record

```bash
zero-cli contacts get <id>
zero-cli companies get <id>
zero-cli deals get <id>
zero-cli tasks get <id>
```

#### Filtering

Pass a JSON filter with `--where`:

```bash
# By workspace
zero-cli contacts list --where '{"workspaceId": "<UUID>"}'

# By name (case-insensitive substring)
zero-cli contacts list --where '{"name": {"$contains": "michael"}}'

# By multiple conditions (AND)
zero-cli companies list --where '{"name": {"$contains": "acme"}, "location.country": "US"}'

# By date range
zero-cli deals list --where '{"closeDate": {"$gte": "2026-01-01", "$lte": "2026-03-31"}}'

# Relative dates
zero-cli deals list --where '{"closeDate": {"$gte": "now()", "$lte": "+30d"}}'

# OR conditions
zero-cli contacts list --where '{"$or": [{"name": {"$contains": "jane"}}, {"name": {"$contains": "john"}}]}'

# Filter on related objects (dot-notation)
zero-cli contacts list --where '{"company.name": "Acme Corp"}'

# Filter on custom properties (use column UUID and option key UUID)
zero-cli contacts list --where '{"custom.<COLUMN_UUID>": "<OPTION_KEY_UUID>"}'
```

See [docs/filtering.md](docs/filtering.md) for the full list of operators.

#### Pagination

```bash
# First 10 records
zero-cli contacts list --limit 10

# Next 10
zero-cli contacts list --limit 10 --offset 10
```

The response includes a `total` field:

```json
{
  "data": [...],
  "total": 247
}
```

#### Select specific fields

```bash
zero-cli contacts list --fields "id,name,email,company.name"
```

#### Sorting

```bash
zero-cli contacts list --order-by '{"createdAt": "desc"}'
```

### Writing data

#### Create records

`workspaceId` is required for all creates:

```bash
# Create a company
zero-cli companies create \
  --workspaceId <UUID> \
  --name "Acme Corp" \
  --domain "acme.com" \
  --location.city "San Francisco" \
  --location.country "US"

# Create a contact (auto-finds/creates company from email domain)
zero-cli contacts create \
  --workspaceId <UUID> \
  --name "Jane Doe" \
  --email "jane@acme.com" \
  --title "VP Sales"

# Create a deal
zero-cli deals create \
  --workspaceId <UUID> \
  --name "Enterprise License" \
  --value 50000 \
  --confidence 0.75

# Create a task (name is required)
zero-cli tasks create \
  --workspaceId <UUID> \
  --name "Follow up with Jane"

# Create a note attached to a contact
zero-cli notes create \
  --workspaceId <UUID> \
  --name "Meeting notes" \
  --contactId <CONTACT_UUID>
```

#### Update records

```bash
# Update a field
zero-cli contacts update <id> --title "CTO"
zero-cli companies update <id> --name "New Name"
zero-cli deals update <id> --confidence 0.9

# Update a custom property (dot-notation with column UUID)
zero-cli companies update <id> --custom.<COLUMN_UUID> "<OPTION_KEY_UUID>"
```

**Important:** Never send the full `custom` object — always use `--custom.<COLUMN_UUID>` to update individual fields.

#### Delete records

```bash
# Hard delete (permanent)
zero-cli contacts delete <id>

# Soft delete / archive (recoverable)
zero-cli contacts delete <id> --archive true
```

### Workspace configuration

#### Sync

Fetches column definitions, users, lists, and deal stages from all accessible workspaces:

```bash
zero-cli columns sync
```

Or sync automatically before any command with `--sync`:

```bash
zero-cli contacts list --sync --hide-nulls
```

#### Inspect cached config

```bash
# Show everything
zero-cli config show

# Filter by workspace (by ID or name)
zero-cli config show --workspace "My Workspace"

# Show specific sections
zero-cli config show --columns
zero-cli config show --users
zero-cli config show --lists
zero-cli config show --stages
```

---

## Options Reference

| Flag | Description | Applies to |
|------|-------------|------------|
| `--where <json>` | Filter records | `list` commands |
| `--fields <string>` | Comma-separated field selection | `list`, `get` |
| `--limit <n>` | Max records to return (default: 100) | `list` commands |
| `--offset <n>` | Pagination offset | `list` commands |
| `--order-by <json>` | Sort order | `list` commands |
| `--hide-nulls` | Remove null fields from output | All data commands |
| `--sync` | Sync workspace config before running | All data commands |
| `--curl` | Print equivalent curl command, don't execute | Any command |
| `--dry-run` | Preview the request without executing | Any command |
| `--bearer-token <t>` | Override stored auth token | Any command |
| `--json` | Force JSON output (default for data commands) | Any command |

---

## How Enrichment Works

When you run `zero-cli columns sync`, the CLI caches workspace metadata locally at `~/.zero-cli-cache.json`. Then on every data command (`list`, `get`, `create`, `update`), the CLI automatically resolves:

| Raw API output | Enriched output |
|----------------|-----------------|
| `custom.54e1ca7d-...`: `"opt-uuid"` | `custom.Status`: `"Active"` |
| `ownerIds`: `["user-uuid"]` | `ownerIds`: `["Alice Smith"]` |
| `listIds`: `["list-uuid"]` | `listIds`: `["VIP Clients"]` |
| `createdById`: `"user-uuid"` | `createdById`: `"Bob Jones"` |
| `stage`: `"stage-uuid"` | `stage`: `"Negotiation"` |
| `pipelineId`: `"pipe-uuid"` | `pipelineId`: `"Sales Pipeline"` |

User-type custom columns are also resolved to user names.

If a UUID isn't in the cache, it's left as-is. Run `zero-cli columns sync` again to refresh.

---

## API Documentation

Full API reference is in the [`docs/`](docs/) directory:

- [API Overview](docs/api-overview.md) — start here
- [Authentication](docs/authentication.md)
- [Filtering](docs/filtering.md) — operators, dot-notation, custom properties
- [Workspaces](docs/workspaces.md) · [Columns](docs/columns.md) · [Companies](docs/companies.md) · [Contacts](docs/contacts.md) · [Deals](docs/deals.md) · [Notes](docs/notes.md) · [Tasks](docs/tasks.md)

---

## Development

```bash
bun install
bun run build        # Build both binaries
bun test             # Run all tests (71 tests)
```

### Project Structure

```
src/
  types.ts    — Shared interfaces (WorkspaceCache, GlobalCache, ColumnDef)
  cache.ts    — Cache load/save with version checking and error logging
  sync.ts     — Workspace config sync (columns, workspaces, users, lists, stages)
  enrich.ts   — UUID-to-name enrichment engine
  output.ts   — Response envelope unwrapping and JSON formatting
  raw.ts      — Raw CLI binary path resolution and execution
  cli.ts      — Main entry point
tests/
  cache.test.ts     — Cache layer tests
  sync.test.ts      — Sync engine tests
  enrich.test.ts    — Enrichment tests
  output.test.ts    — Output formatting tests
  cli.test.ts       — End-to-end CLI tests
docs/               — Zero API reference documentation
spec/               — OpenAPI spec (source of truth for raw CLI generation)
```

### Updating the API spec

If the Zero API spec changes, replace `spec/zero-api.yaml` and rebuild:

```bash
bun run build
```
