# Zero CRM CLI (`zero-cli`)

A feature-complete CLI for [Zero CRM](https://zero.inc) generated from its OpenAPI specification using [specli](https://github.com/vercel-labs/specli).

## Quick Start

### 1. Installation

If you haven't compiled the binary yet, run:

```bash
bun install
bun run build
```

The binary will be located at `./bin/zero-cli`. You can move it to your `/usr/local/bin` or add it to your `PATH`.

### 2. Authentication

Get your API token from your Zero account settings and log in:

```bash
./bin/zero-cli login <YOUR_API_TOKEN>
```

Alternatively, you can provide the token for individual commands using the `--bearer-token` flag.

### 3. Usage Examples

#### **List Workspaces**
Get your workspace IDs to use in other commands:
```bash
./bin/zero-cli workspaces list-workspaces
```

#### **Manage Companies**
List companies in a specific workspace:
```bash
./bin/zero-cli companies list-companies --where '{"workspaceId": "YOUR_WORKSPACE_ID"}'
```

Create a new company:
```bash
./bin/zero-cli companies create-company --name "Acme Corp" --domain "acme.com"
```

#### **Manage Contacts**
List contacts with specific fields and related company info:
```bash
./bin/zero-cli contacts list-contacts --fields "id,name,email,company.name"
```

#### **Custom Properties & Enrichment**
By default, the API returns custom property IDs as UUIDs. This CLI can resolve these into human-readable names.

1. **Sync Column Definitions:**
   Cache the mapping of UUIDs to names locally:
   ```bash
   ./bin/zero-cli columns sync
   ```

2. **View Enriched Output:**
   UUIDs in the `custom` object will now show their display names:
   ```bash
   ./bin/zero-cli contacts list --where '{"name": "Michael"}'
   ```

3. **Clean Up Output:**
   Use the `--hide-nulls` flag to remove empty fields and focus on relevant data:
   ```bash
   ./bin/zero-cli contacts list --where '{"name": "Michael"}' --hide-nulls
   ```

#### **Custom Properties**
Discover custom field UUIDs (raw):
```bash
./bin/zero-cli columns list
```

Update a custom property using dot-notation:
```bash
./bin/zero-cli companies update <COMPANY_ID> --custom.UUID "New Value"
```

#### **Advanced Features**
- **JSON Output:** The CLI always outputs JSON for data-returning commands to support enrichment.
- **Sync On-The-Fly:** Add `--sync` to any command to refresh column definitions before executing.
- **Dry Run:** Use `--dry-run` to see the request without executing it.
- **cURL Command:** Use `--curl` to generate an equivalent `curl` command.

## Development

The CLI is generated from `spec/zero-api.yaml`. If the API spec is updated, simply replace the file and re-run the build script.

```bash
bun run build
```
