import { spawnSync } from "node:child_process";
import { getRawCliPath, execRawJson } from "./raw";
import { loadCache, saveCache, getWorkspace } from "./cache";
import { extractDataArray, syncColumnsFromData, syncWorkspacesFromData, captureContext } from "./sync";
import { enrichObject } from "./enrich";
import { unwrapResponse, formatJson } from "./output";
import type { GlobalCache } from "./types";

const RAW_CLI = getRawCliPath();

function runSync(): void {
  console.error("Syncing workspace configuration...");
  const cache = loadCache();

  // 1. Fetch workspaces
  const wsResult = execRawJson(RAW_CLI, ["workspaces", "list"]);
  if (wsResult.success) {
    const data = extractDataArray(wsResult.data);
    const count = syncWorkspacesFromData(data, cache);
    console.error(`  Workspaces: ${count}`);
  } else {
    console.error(`  Warning: failed to fetch workspaces: ${wsResult.error}`);
  }

  // 2. Fetch columns
  const colResult = execRawJson(RAW_CLI, ["columns", "list"]);
  if (colResult.success) {
    const data = extractDataArray(colResult.data);
    const count = syncColumnsFromData(data, cache);
    console.error(`  Columns: ${count}`);
  } else {
    console.error(`  Warning: failed to fetch columns: ${colResult.error}`);
  }

  // 3. Bootstrap context from contacts (owners, lists)
  const ctxResult = execRawJson(RAW_CLI, [
    "contacts", "list",
    "--fields", "workspaceId,owners.id,owners.name,lists.id,lists.name",
    "--limit", "50",
  ]);
  if (ctxResult.success) {
    captureContext(ctxResult.data, cache);
  }

  // 4. Bootstrap context from deals (stages, pipelines)
  const dealResult = execRawJson(RAW_CLI, [
    "deals", "list",
    "--fields", "workspaceId,stage,pipeline.id,pipeline.name,stageObject.id,stageObject.name",
    "--limit", "50",
  ]);
  if (dealResult.success) {
    captureContext(dealResult.data, cache);
  }

  saveCache(cache);
  const wsCount = Object.keys(cache.workspaces).length;
  console.error(`Synced configuration for ${wsCount} workspace(s).`);
}

function showConfig(args: string[]): void {
  const cache = loadCache();

  if (Object.keys(cache.workspaces).length === 0) {
    console.error("No cached workspace configuration. Run 'columns sync' or use --sync first.");
    process.exit(1);
  }

  // Check for workspace filter
  const wsIdx = args.indexOf("--workspace");
  const wsFilter = wsIdx !== -1 ? args[wsIdx + 1] : undefined;

  // Check for section filter
  const showColumns = args.includes("--columns");
  const showUsers = args.includes("--users");
  const showLists = args.includes("--lists");
  const showStages = args.includes("--stages");
  const showAll = !showColumns && !showUsers && !showLists && !showStages;

  const output: Record<string, any> = {};

  for (const [wsId, ws] of Object.entries(cache.workspaces)) {
    if (wsFilter && wsId !== wsFilter && ws.name !== wsFilter) continue;

    const wsOutput: Record<string, any> = {};
    if (ws.name) wsOutput.name = ws.name;
    if (showAll || showColumns) wsOutput.columns = ws.columns;
    if (showAll || showUsers) wsOutput.users = ws.users;
    if (showAll || showLists) wsOutput.lists = ws.lists;
    if (showAll || showStages) {
      wsOutput.stages = ws.stages;
      wsOutput.pipelines = ws.pipelines;
    }
    output[wsId] = wsOutput;
  }

  if (cache.syncedAt) {
    console.error(`Last synced: ${cache.syncedAt}`);
  }
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}

export async function main(): Promise<void> {
  const allArgs = process.argv.slice(2);

  // Extract our custom flags
  const hideNulls = allArgs.includes("--hide-nulls");
  const sync = allArgs.includes("--sync");
  const isHelp = allArgs.includes("--help") || allArgs.includes("-h") || allArgs.length === 0;

  const filteredArgs = allArgs.filter(
    (arg) => arg !== "--hide-nulls" && arg !== "--sync"
  );
  const firstArg = filteredArgs[0];
  const secondArg = filteredArgs[1];

  // Passthrough commands: help, login, logout, whoami, schema
  if (isHelp || ["login", "logout", "whoami", "__schema"].includes(firstArg)) {
    const result = spawnSync(RAW_CLI, filteredArgs, { stdio: "inherit" });
    process.exit(result.status ?? 0);
  }

  // columns sync → run sync
  if (firstArg === "columns" && secondArg === "sync") {
    runSync();
    return;
  }

  // config show → show cached config
  if (firstArg === "config" && secondArg === "show") {
    showConfig(filteredArgs.slice(2));
    return;
  }

  // config → help for config
  if (firstArg === "config") {
    console.log("Usage: zero-cli config show [options]");
    console.log("");
    console.log("Options:");
    console.log("  --workspace <id|name>  Show only one workspace");
    console.log("  --columns              Show only columns");
    console.log("  --users                Show only users");
    console.log("  --lists                Show only lists");
    console.log("  --stages               Show only stages/pipelines");
    return;
  }

  // Auto-sync if --sync flag
  if (sync) runSync();

  // Data commands: resource + action
  const dataActions = ["list", "get", "create", "update", "delete"];
  const isDataCommand = filteredArgs.length >= 2 && dataActions.includes(secondArg);
  const isCurl = filteredArgs.includes("--curl");
  const isDryRun = filteredArgs.includes("--dry-run");

  if (isDataCommand && !isCurl && !isDryRun) {
    const execArgs = [...filteredArgs];
    if (!execArgs.includes("--json")) execArgs.push("--json");

    const result = spawnSync(RAW_CLI, execArgs);
    if (result.status !== 0) {
      if (result.stderr) process.stderr.write(result.stderr);
      process.exit(result.status || 1);
    }

    const stdoutStr = result.stdout.toString();
    try {
      const raw = JSON.parse(stdoutStr);
      const cache = loadCache();

      // Capture any new context from the response
      captureContext(raw, cache);
      saveCache(cache);

      // Unwrap, enrich, format
      const unwrapped = unwrapResponse(raw);
      const enrichedData = enrichObject(unwrapped.data, cache, { hideNulls });
      const output = formatJson({ data: enrichedData, total: unwrapped.total });
      process.stdout.write(output + "\n");
    } catch {
      // If JSON parsing fails, pass through raw output
      process.stdout.write(stdoutStr);
    }
  } else {
    // All other commands: passthrough to raw CLI
    const result = spawnSync(RAW_CLI, filteredArgs, { stdio: "inherit" });
    process.exit(result.status ?? 0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
