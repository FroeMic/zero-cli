import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { loadCache, saveCache, getWorkspace } from "../src/cache";
import { emptyGlobalCache, emptyWorkspaceCache, CACHE_VERSION } from "../src/types";

const TEST_CACHE = path.join(os.tmpdir(), `zero-cli-test-cache-${Date.now()}.json`);

afterEach(() => {
  try { fs.unlinkSync(TEST_CACHE); } catch {}
});

describe("loadCache", () => {
  test("returns empty cache when file does not exist", () => {
    const cache = loadCache("/tmp/nonexistent-zero-cache-file.json");
    expect(cache).toEqual(emptyGlobalCache());
  });

  test("loads a valid cache file", () => {
    const data = { version: CACHE_VERSION, workspaces: { "ws-1": emptyWorkspaceCache() } };
    fs.writeFileSync(TEST_CACHE, JSON.stringify(data));
    const cache = loadCache(TEST_CACHE);
    expect(cache.version).toBe(CACHE_VERSION);
    expect(cache.workspaces["ws-1"]).toBeDefined();
  });

  test("returns empty cache for invalid JSON", () => {
    fs.writeFileSync(TEST_CACHE, "not json");
    const cache = loadCache(TEST_CACHE);
    expect(cache).toEqual(emptyGlobalCache());
  });

  test("returns empty cache for wrong version", () => {
    fs.writeFileSync(TEST_CACHE, JSON.stringify({ version: 999, workspaces: {} }));
    const cache = loadCache(TEST_CACHE);
    expect(cache).toEqual(emptyGlobalCache());
  });

  test("returns empty cache for missing workspaces key", () => {
    fs.writeFileSync(TEST_CACHE, JSON.stringify({ version: CACHE_VERSION }));
    const cache = loadCache(TEST_CACHE);
    expect(cache).toEqual(emptyGlobalCache());
  });
});

describe("saveCache", () => {
  test("writes cache to file and can be loaded back", () => {
    const cache = emptyGlobalCache();
    cache.workspaces["ws-1"] = {
      ...emptyWorkspaceCache(),
      name: "Test Workspace",
    };
    saveCache(cache, TEST_CACHE);

    const loaded = loadCache(TEST_CACHE);
    expect(loaded.version).toBe(CACHE_VERSION);
    expect(loaded.syncedAt).toBeDefined();
    expect(loaded.workspaces["ws-1"].name).toBe("Test Workspace");
  });

  test("sets syncedAt timestamp", () => {
    const cache = emptyGlobalCache();
    saveCache(cache, TEST_CACHE);
    const loaded = loadCache(TEST_CACHE);
    expect(loaded.syncedAt).toBeTruthy();
    // Should be a valid ISO date
    expect(new Date(loaded.syncedAt!).toISOString()).toBe(loaded.syncedAt);
  });
});

describe("getWorkspace", () => {
  test("creates a new workspace entry if missing", () => {
    const cache = emptyGlobalCache();
    const ws = getWorkspace(cache, "new-ws");
    expect(ws).toEqual(emptyWorkspaceCache());
    expect(cache.workspaces["new-ws"]).toBe(ws);
  });

  test("returns existing workspace", () => {
    const cache = emptyGlobalCache();
    cache.workspaces["existing"] = { ...emptyWorkspaceCache(), name: "Existing" };
    const ws = getWorkspace(cache, "existing");
    expect(ws.name).toBe("Existing");
  });
});
