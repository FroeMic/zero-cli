# Zero CLI — Implementation Plan

## Goals
1. **Workspace config generation** — sync workspace metadata (columns, users, lists, pipelines, stages) into a local config
2. **Clean, enriched output** — resolve all UUIDs (custom fields, select options, owners, stages, etc.) to human-readable names; output processable by humans and LLMs
3. **No hardcoded values** — enrichment driven by workspace config, not hardcoded field names

## Approach
- TDD: write tests first, then implement, iterate until green, commit
- Incremental steps — each step is independently testable and committable
- Rewrite `index.ts` into focused modules instead of one monolith

---

## Steps

### Step 1: Module scaffold + cache layer
**Goal:** Extract cache logic into its own module with proper types, file I/O, error handling.

- `src/cache.ts` — `loadCache()`, `saveCache()`, `getWorkspace()`, cache types
- `src/types.ts` — shared interfaces (`WorkspaceCache`, `GlobalCache`, `ColumnDef`, etc.)
- Tests: load/save roundtrip, missing file handling, workspace creation, schema validation
- **No enrichment yet, no CLI wiring**

### Step 2: Sync engine — columns
**Goal:** Fetch column definitions from the raw CLI and store them with full type info.

- `src/sync.ts` — `syncColumns(rawCli)` function
- Stores column `type`, `name`, `entity`, and `options` (with key→name mapping)
- Tests: mock raw CLI output → verify cache contains correct column definitions; verify select/multiselect options are stored; verify different column types are preserved
- **Depends on:** Step 1

### Step 3: Sync engine — workspaces + context bootstrap
**Goal:** Fetch workspace names and bootstrap user/list context.

- Extend `src/sync.ts` — `syncWorkspaces()`, `syncContext()` (users, lists from contacts/deals)
- Store workspace names, user id→name, list id→name
- Tests: mock workspace list → verify names cached; mock contacts with owners/lists → verify user and list caches populated; handle empty responses gracefully
- **Depends on:** Steps 1–2

### Step 4: Enrichment engine — custom fields
**Goal:** Resolve `custom` object UUIDs to human-readable names using column type.

- `src/enrich.ts` — `enrichObject(obj, cache, options)`
- Column UUID keys → column names
- `select`/`multiselect` option key UUIDs → option display names
- `user`-type columns → user names from cache
- Tests: custom field with select option → resolved; multiselect → all resolved; user-type column → resolved to name; unknown UUID → left as-is; nested objects handled
- **Depends on:** Steps 1–2

### Step 5: Enrichment engine — standard ID fields
**Goal:** Resolve common ID fields across all entity types.

- Extend `src/enrich.ts`
- `ownerIds` → user names, `listIds` → list names, `createdById`/`updatedById` → user names, `assignedToIds` → user names
- Derive enrichable fields from column `type` metadata (not hardcoded field names) where possible
- `--hide-nulls` support
- Tests: ownerIds array → names; createdById string → name; listIds → names; unknown IDs → left as-is; hide-nulls removes null values
- **Depends on:** Steps 1–4

### Step 6: Enrichment engine — deals (stage + pipeline)
**Goal:** Resolve deal-specific UUIDs (stage, pipelineId).

- Extend sync to capture pipeline/stage names from deal responses
- Extend enrichment to resolve `stage` and `pipelineId`
- Tests: deal with stage UUID → resolved to stage name; pipeline UUID → name; uncached stage → left as UUID
- **Depends on:** Steps 1–5

### Step 7: Response unwrapping
**Goal:** Clean the API response envelope so output is the useful data, not the wrapper.

- `src/output.ts` — `formatOutput(response, options)`
- Unwrap `body.data` or `data` arrays/objects
- Include `total` as metadata when relevant
- Tests: wrapped response → unwrapped; single record → just the record; list → array with total; already-flat response → unchanged
- **Depends on:** Steps 4–6

### Step 8: CLI wiring — replace index.ts
**Goal:** Rewrite the main entry point to use the new modules.

- `src/cli.ts` — main entry point
- Wire up: arg parsing → sync (if needed) → raw CLI call → parse → enrich → format → output
- `columns sync` command → calls sync engine
- `config show` command → dumps current cached config
- `--sync` flag → sync before command
- `--hide-nulls` flag → passed to enrichment
- Tests: end-to-end with mocked raw CLI; verify enriched output for contacts, companies, deals; verify `config show` outputs cache; verify passthrough for login/logout/help
- **Depends on:** Steps 1–7

### Step 9: Config show + inspect commands
**Goal:** Let users inspect their workspace configuration.

- `config show` — dump full workspace config (columns, users, lists, stages)
- `config show --workspace <id>` — single workspace
- `config show --columns` — just columns
- Tests: show outputs JSON with all cached data; workspace filter works; columns filter works
- **Depends on:** Steps 1–3, 8

### Step 10: Integration tests + cleanup
**Goal:** Full end-to-end tests against the compiled binary.

- Test each resource type (contacts, companies, deals, notes, tasks) with `--curl` to validate command generation
- Test enrichment end-to-end with a pre-populated cache file
- Update README with correct command syntax
- Clean up any remaining issues
- **Depends on:** All prior steps

---

## File Structure (target)

```
src/
  types.ts        — shared interfaces
  cache.ts        — cache load/save/access
  sync.ts         — workspace config sync engine
  enrich.ts       — UUID → name enrichment
  output.ts       — response unwrapping + formatting
  cli.ts          — main entry point (replaces index.ts)
  raw.ts          — raw CLI binary path resolution + execution
tests/
  cache.test.ts
  sync.test.ts
  enrich.test.ts
  output.test.ts
  cli.test.ts     — end-to-end tests
docs/             — API reference (already created)
```

---

## Status

| Step | Description | Status |
|------|-------------|--------|
| 1 | Module scaffold + cache layer | done |
| 2 | Sync engine — columns | done |
| 3 | Sync engine — workspaces + context | done |
| 4 | Enrichment — custom fields | done |
| 5 | Enrichment — standard ID fields | done |
| 6 | Enrichment — deals (stage/pipeline) | done |
| 7 | Response unwrapping | done |
| 8 | CLI wiring — replace index.ts | done |
| 9 | Config show/inspect commands | done |
| 10 | Integration tests + cleanup | done |
