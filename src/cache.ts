import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type GlobalCache,
  type WorkspaceCache,
  CACHE_VERSION,
  emptyGlobalCache,
  emptyWorkspaceCache,
} from "./types";

const DEFAULT_CACHE_PATH = path.join(os.homedir(), ".zero-cli-cache.json");

export function getCachePath(): string {
  return process.env.ZERO_CLI_CACHE_PATH || DEFAULT_CACHE_PATH;
}

export function loadCache(cachePath?: string): GlobalCache {
  const filePath = cachePath ?? getCachePath();
  if (!fs.existsSync(filePath)) {
    return emptyGlobalCache();
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || !data.workspaces) {
      console.error("Warning: cache file has invalid structure, starting fresh.");
      return emptyGlobalCache();
    }
    if (data.version !== CACHE_VERSION) {
      console.error(`Warning: cache version mismatch (got ${data.version}, expected ${CACHE_VERSION}), starting fresh.`);
      return emptyGlobalCache();
    }
    return data as GlobalCache;
  } catch (e) {
    console.error(`Warning: failed to read cache file: ${(e as Error).message}`);
    return emptyGlobalCache();
  }
}

export function saveCache(cache: GlobalCache, cachePath?: string): void {
  const filePath = cachePath ?? getCachePath();
  cache.version = CACHE_VERSION;
  cache.syncedAt = new Date().toISOString();
  try {
    fs.writeFileSync(filePath, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error(`Warning: failed to write cache file: ${(e as Error).message}`);
  }
}

export function getWorkspace(cache: GlobalCache, id: string): WorkspaceCache {
  if (!cache.workspaces[id]) {
    cache.workspaces[id] = emptyWorkspaceCache();
  }
  return cache.workspaces[id];
}
