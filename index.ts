import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

// We'll call the raw binary we compiled from the spec
const getRawCliPath = () => {
  const exeDir = path.dirname(process.execPath);
  const paths = [
    path.join(exeDir, "zero-cli-raw"),
    path.join(import.meta.dirname, "zero-cli-raw"),
    path.join(import.meta.dirname, "bin", "zero-cli-raw"),
    path.join(process.cwd(), "bin", "zero-cli-raw"),
    path.join(process.cwd(), "zero-cli-raw")
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return paths[0]; // Default
};

const RAW_CLI = getRawCliPath();
const CACHE_FILE = path.join(os.homedir(), ".zero-cli-cache.json");

function loadCache(): Record<string, string> {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveCache(cache: Record<string, string>) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function syncColumns() {
  console.log("Syncing column definitions...");
  
  // Attempt to get columns. We might need to pass through any workspaceId if the user has one.
  // For now, let's just try the raw list.
  const result = spawnSync(RAW_CLI, ["columns", "list", "--json"]);
  
  const stdoutStr = result.stdout?.toString() || "";
  const stderrStr = result.stderr?.toString() || "";

  if (result.status === 0) {
    try {
      const output = JSON.parse(stdoutStr);
      const data = output.data || output;
      if (Array.isArray(data)) {
        const cache: Record<string, string> = {};
        data.forEach((col: any) => {
          if (col.id && col.name) {
            cache[col.id] = col.name;
          }
        });
        saveCache(cache);
        console.log(`Successfully synced ${Object.keys(cache).length} columns.`);
        return;
      } else {
        console.error("Debug: Received JSON but 'data' is not an array.");
        console.error("Output summary:", stdoutStr.slice(0, 200));
      }
    } catch (e) {
      console.error("Debug: Failed to parse JSON output from columns list");
      console.error("Raw stdout (first 200 chars):", stdoutStr.slice(0, 200));
    }
  } else {
    console.error(`Debug: RAW_CLI failed with status ${result.status}`);
    if (stderrStr) console.error("Stderr:", stderrStr);
  }
  console.error("Failed to sync columns. Make sure you are logged in and have access to the workspace.");
}

function enrichObject(obj: any, cache: Record<string, string>, hideNulls: boolean) {
  if (Array.isArray(obj)) {
    return obj.map(item => enrichObject(item, cache, hideNulls));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (hideNulls && value === null) continue;

      // Handle the 'custom' object enrichment
      if (key === 'custom' && value !== null && typeof value === 'object') {
        const enrichedCustom: any = {};
        for (const [uuid, val] of Object.entries(value as object)) {
          if (hideNulls && val === null) continue;
          const name = cache[uuid] || uuid;
          enrichedCustom[name] = enrichObject(val, cache, hideNulls);
        }
        newObj[key] = enrichedCustom;
        continue;
      }

      newObj[key] = enrichObject(value, cache, hideNulls);
    }
    return newObj;
  }
  
  return obj;
}

async function main() {
  const allArgs = process.argv.slice(2);
  
  // Manual flag parsing to avoid Commander's strict positional checking
  const hideNulls = allArgs.includes("--hide-nulls");
  const sync = allArgs.includes("--sync");
  const isHelp = allArgs.includes("--help") || allArgs.includes("-h") || allArgs.length === 0;
  
  // Filter out our custom flags
  const filteredArgs = allArgs.filter(arg => arg !== '--hide-nulls' && arg !== '--sync');
  const firstArg = filteredArgs[0];

  if (isHelp || ["login", "logout", "whoami", "__schema"].includes(firstArg)) {
    const result = spawnSync(RAW_CLI, filteredArgs, { stdio: "inherit" });
    process.exit(result.status ?? 0);
  }

  if (firstArg === "columns" && filteredArgs[1] === "sync") {
    syncColumns();
    return;
  }

  if (sync) {
    syncColumns();
  }

  // Determine if we should attempt enrichment (only for list/get/create/update)
  const dataActions = ["list", "get", "create", "update"];
  const isDataCommand = filteredArgs.length >= 2 && dataActions.includes(filteredArgs[1]);
  const isCurl = filteredArgs.includes("--curl");

  if (isDataCommand && !isCurl) {
    // Force --json for enrichment
    const execArgs = [...filteredArgs];
    if (!execArgs.includes("--json")) {
      execArgs.push("--json");
    }

    const result = spawnSync(RAW_CLI, execArgs);
    
    if (result.status !== 0) {
      if (result.stderr) process.stderr.write(result.stderr);
      process.exit(result.status || 1);
    }

    const stdoutStr = result.stdout.toString();
    try {
      const output = JSON.parse(stdoutStr);
      const cache = loadCache();
      const enriched = enrichObject(output, cache, hideNulls);
      process.stdout.write(JSON.stringify(enriched, null, 2) + "\n");
    } catch (e) {
      process.stdout.write(stdoutStr);
    }
  } else {
    // Pass through everything else directly
    const result = spawnSync(RAW_CLI, filteredArgs, { stdio: "inherit" });
    process.exit(result.status ?? 0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
