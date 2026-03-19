# Code Review: zero-cli

## Summary

The CLI takes a smart two-binary approach: `zero-cli-raw` is generated directly from the OpenAPI spec via `specli`, while `zero-cli` is a thin wrapper that adds enrichment (UUID resolution), workspace caching, and flag preprocessing. The core idea is sound. Several areas need improvement to meet the three stated goals.

---

## Against the Three Specs

### Spec 1: Generate workspace configuration

**Current state:** `zero-cli columns sync` fetches columns and workspaces, then uses a hack (fetching contacts) to bootstrap user/list lookups.

**Issues:**
- The command is named `sync` but there is no way to *view* the current configuration (e.g., `config show`).
- The bootstrap trick (fetching 50 contacts to get user/list names) is fragile: if no contacts have owners or list memberships, the cache stays empty.
- There is no way to sync a single workspace — it always syncs everything.
- Users, lists, pipelines, and stages are not fetched from their own endpoints; they rely on data embedded in other records. This means stages (deals) and pipelines are never resolved.
- The cache has no TTL or staleness indicator — there is no way to know if it's stale.

**Recommendation:** Add explicit fetch calls for users (`/api/users`?), lists, and pipeline stages if those endpoints exist, or document the limitation clearly. Add a `config show` command. Add a per-workspace sync option.

---

### Spec 2: Clean outputs resolvable by humans and LLMs

**Current state:** The `enrichObject` function replaces UUIDs in `custom`, `ownerIds`, `listIds`, and `assignedToIds` with human-readable values.

**Issues:**
- `ownerIds` is treated as both a string scalar and an array in the same branch (lines 202–205). The field is an array in the API — the scalar branch is dead code.
- `createdById` and `updatedById` are resolved but these are single UUIDs, not arrays — the existing logic handles them correctly. However there is no enrichment for `pipelineId` or `stage` in deals (both UUIDs).
- `captureContext` identifies users by `obj.email` or `obj._model === 'users'`. The `_model` field doesn't exist in the real API responses; email is unreliable (companies can have emails too). This means the user cache is rarely populated from live responses.
- `allOptions` is workspace-keyed in the `WorkspaceCache` but stored globally — option key UUIDs are workspace-scoped in practice, so cross-workspace collisions are possible.
- Output is always JSON. A `--table` or `--pretty` flag for human-readable tabular output would make the CLI more useful interactively.
- The enrichment wraps the entire response including meta fields (`body`, `data`, `total`) — LLMs and humans have to dig into the nested `data` to find records. Consider outputting `data` directly (or optionally).

---

### Spec 3: Work with any workspace config — no hardcoded values

**Issues:**
- `ownerIds`, `assignedToIds`, `listIds`, `createdById`, `updatedById` are hardcoded field names in `enrichObject`. This works today but will break if Zero renames fields or adds new ID-typed fields.
- The column `type` values used for enrichment (`options` presence check) are correct, but the `user` column type (referencing workspace members) is not enriched even though the `users` cache exists.
- The enrichment logic has no knowledge of which column type maps to which enrichment strategy — it infers this from the presence of `options` rather than from the `type` field. This means `user`-type columns, `company`-type columns, and `contact`-type columns all get zero enrichment.

**Recommendation:** After `columns sync`, store each column's `type` in the cache. Use `type` to drive enrichment: `user` → look up user cache, `select`/`multiselect` → look up options, `company`/`contact` → possibly include the linked record's name if fetched with `fields`.

---

## Code Quality

### Architecture

| Area | Observation |
|------|-------------|
| File structure | All logic is in a single 277-line `index.ts`. Should be split into modules: `cache.ts`, `enrich.ts`, `sync.ts`, `cli.ts`. |
| Error handling | All `catch (e) {}` blocks are silent. Errors during sync are invisible, leaving the cache empty with no indication. |
| Binary path resolution | 5-path fallback in `getRawCliPath()` is fragile. The compiled binary should know where its sibling lives. |
| Two-binary model | Adds operational complexity (both binaries must be deployed together). Consider whether `specli` can be used as a library instead. |
| Tests | Only `--curl` flag tests — no enrichment tests, no sync tests. |

### Specific Issues

```ts
// index.ts:202 — ownerIds treated as scalar, but it's always an array
if ((key === 'ownerIds' || key === 'assignedToIds' || ...) && typeof value === 'string') {
  enrichedValue = w.users[value] || value;
}
```

```ts
// index.ts:147 — _model doesn't exist in real API responses
if (model === 'users' || obj.email) {
  w.users[obj.id] = obj.name;
}
```

```ts
// index.ts:84 — silent catch; sync failures are invisible
} catch (e) {}
```

### Bun Compatibility

The project uses `node:fs`, `node:child_process`, `node:path`, and `node:os` throughout. Per `CLAUDE.md`:
- `fs.readFileSync` / `fs.writeFileSync` → `Bun.file().text()` / `Bun.write()`
- `spawnSync` → `Bun.$\`...\`` (though `spawnSync` is fine for synchronous subprocess calls)

---

## README Issues

The README references command syntax that doesn't match the current CLI:
- `workspaces list-workspaces` should be `workspaces list`
- `companies list-companies` should be `companies list`
- `--where '{"workspaceId": "..."}'` — this syntax is correct

---

## Priority Recommendations

1. **Fix silent errors** — log warnings when sync steps fail so users know the cache is incomplete.
2. **Add `config show`** — let users inspect the cached workspace configuration.
3. **Fix the user cache** — don't rely on `_model` or `email` heuristics; fetch users explicitly or document the limitation.
4. **Add stage/pipeline resolution** for deals.
5. **Use column `type` for enrichment decisions** instead of inferring from `options` presence.
6. **Split `index.ts`** into focused modules.
7. **Add enrichment tests** — not just curl tests.
8. **Update README** with correct command syntax.
