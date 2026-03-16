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
  console.error("Failed to sync columns. Make sure you are logged in using 'zero-cli login <token>'.");
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
  const args = process.argv.slice(2);
  const firstArg = args[0];

  // Commands that should be passed through directly without Commander parsing
  const rawCommands = ["login", "logout", "whoami", "__schema", "help"];
  if (rawCommands.includes(firstArg) || args.length === 0) {
    const result = spawnSync(RAW_CLI, args, { stdio: "inherit" });
    process.exit(result.status ?? 0);
  }

  // If it's the custom sync command
  if (firstArg === "columns" && args[1] === "sync") {
     syncColumns();
     return;
  }

  const program = new Command();
  
  program
    .name("zero-cli")
    .version("1.1.1")
    .description("Zero CRM CLI with enriched output")
    .option("--hide-nulls", "Hide null values from output")
    .option("--sync", "Sync column definitions before running")
    .allowUnknownOption();

  program.action((options, command) => {
    const commandArgs = command.args;
    
    if (options.sync) {
      syncColumns();
    }

    // Filter our custom flags from the original process.argv
    const filteredArgs = args.filter(arg => 
      arg !== '--hide-nulls' && arg !== '--sync'
    );

    // If it's a data command, we force --json to intercept
    if (filteredArgs.includes("--curl") || filteredArgs.includes("-h") || filteredArgs.includes("--help")) {
      spawnSync(RAW_CLI, filteredArgs, { stdio: "inherit" });
      return;
    }

    // Force --json for enrichment unless already present
    const execArgs = [...filteredArgs];
    if (!execArgs.includes("--json")) {
      execArgs.push("--json");
    }

    const result = spawnSync(RAW_CLI, execArgs);
    
    if (result.status !== 0) {
      process.stderr.write(result.stderr);
      process.exit(result.status || 1);
    }

    const stdoutStr = result.stdout.toString();
    try {
      const output = JSON.parse(stdoutStr);
      const cache = loadCache();
      const enriched = enrichObject(output, cache, !!options.hideNulls);
      console.log(JSON.stringify(enriched, null, 2));
    } catch (e) {
      // If not JSON, just print raw stdout
      process.stdout.write(stdoutStr);
    }
  });

  program.parse(process.argv);
}

main();
