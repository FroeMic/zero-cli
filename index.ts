import { Command } from "commander";
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

// We'll call the raw binary we compiled from the spec
const RAW_CLI = path.join(import.meta.dirname, "zero-cli-raw");
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
  // Call raw CLI to get columns
  const result = spawnSync(RAW_CLI, ["columns", "list", "--json"]);
  
  if (result.status === 0) {
    try {
      const output = JSON.parse(result.stdout.toString());
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
      }
    } catch (e) {}
  }
  console.error("Failed to sync columns. Make sure you are logged in.");
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
  const program = new Command();
  
  program
    .name("zero-cli")
    .version("1.1.0")
    .description("Zero CRM CLI with enriched output")
    .option("--hide-nulls", "Hide null values from output")
    .option("--sync", "Sync column definitions before running")
    .allowUnknownOption();

  // Add explicit columns sync command
  const columns = program.command("columns");
  columns
    .command("sync")
    .description("Sync column definitions and cache them locally")
    .action(() => {
      syncColumns();
    });

  program.action((options, command) => {
    const args = command.args;
    
    // Commands that should be passed through directly without enrichment
    const passThroughCommands = ["login", "logout", "whoami", "__schema", "help"];
    if (passThroughCommands.includes(args[0]) || args.length === 0) {
      spawnSync(RAW_CLI, process.argv.slice(2), { stdio: "inherit" });
      return;
    }

    if (options.sync) {
      syncColumns();
    }

    // Filter our custom flags
    const rawArgs = process.argv.slice(2).filter(arg => 
      arg !== '--hide-nulls' && arg !== '--sync'
    );

    // If it's a data command, we force --json to intercept
    // We check if --curl is present, if so, we just pass through
    if (rawArgs.includes("--curl") || rawArgs.includes("-h") || rawArgs.includes("--help")) {
      spawnSync(RAW_CLI, rawArgs, { stdio: "inherit" });
      return;
    }

    // Force --json for enrichment
    if (!rawArgs.includes("--json")) {
      rawArgs.push("--json");
    }

    const result = spawnSync(RAW_CLI, rawArgs);
    
    if (result.status !== 0) {
      process.stderr.write(result.stderr);
      process.exit(result.status || 1);
    }

    try {
      const output = JSON.parse(result.stdout.toString());
      const cache = loadCache();
      const enriched = enrichObject(output, cache, !!options.hideNulls);
      console.log(JSON.stringify(enriched, null, 2));
    } catch (e) {
      // If not JSON, just print raw stdout
      process.stdout.write(result.stdout);
    }
  });

  program.parse(process.argv);
}

main();
