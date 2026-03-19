import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { type GlobalCache, emptyGlobalCache, emptyWorkspaceCache, CACHE_VERSION } from "../src/types";

const CLI_PATH = "./bin/zero-cli";
const AUTH = ["--bearer-token", "token"];
const VALID_WS_ID = "550e8400-e29b-41d4-a716-446655440000";
const TEST_CACHE = path.join(os.tmpdir(), `zero-cli-e2e-test-cache-${Date.now()}.json`);

function runCli(args: string[], env?: Record<string, string>): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync(CLI_PATH, args, {
    env: { ...process.env, ZERO_CLI_CACHE_PATH: TEST_CACHE, ...env },
  });
  return {
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? "",
    status: result.status,
  };
}

function writeTestCache(cache: GlobalCache) {
  fs.writeFileSync(TEST_CACHE, JSON.stringify(cache, null, 2));
}

afterAll(() => {
  try { fs.unlinkSync(TEST_CACHE); } catch {}
});

describe("zero-cli passthrough commands (curl)", () => {
  test("workspaces list generates correct curl command", () => {
    const { stdout } = runCli(["workspaces", "list", "--curl", ...AUTH]);
    expect(stdout).toContain("curl -sS -X GET");
    expect(stdout).toContain("https://api.zero.inc/api/workspaces");
    expect(stdout).toContain("authorization: Bearer ***");
  });

  test("companies create includes body and workspaceId", () => {
    const { stdout } = runCli([
      "companies", "create",
      "--workspaceId", VALID_WS_ID,
      "--name", "Test Corp",
      "--domain", "test.com",
      "--curl",
      ...AUTH,
    ]);
    expect(stdout).toContain("-X POST");
    expect(stdout).toContain(`"workspaceId":"${VALID_WS_ID}"`);
    expect(stdout).toContain('"name":"Test Corp"');
    expect(stdout).toContain('"domain":"test.com"');
  });

  test("contacts list handles complex filters", () => {
    const where = JSON.stringify({ workspaceId: "uuid-123" });
    const { stdout } = runCli([
      "contacts", "list",
      "--where", where,
      "--curl",
      ...AUTH,
    ]);
    expect(stdout).toContain("GET");
    expect(stdout).toContain("where=" + encodeURIComponent(where));
  });

  test("companies update generates patch with id", () => {
    const { stdout } = runCli([
      "companies", "update", "company-123",
      "--name", "New Name",
      "--curl",
      ...AUTH,
    ]);
    expect(stdout).toContain("-X PATCH");
    expect(stdout).toContain("https://api.zero.inc/api/companies/company-123");
    expect(stdout).toContain('"name":"New Name"');
  });

  test("deals list generates correct curl command", () => {
    const { stdout } = runCli([
      "deals", "list",
      "--where", `{"workspaceId":"${VALID_WS_ID}"}`,
      "--curl",
      ...AUTH,
    ]);
    expect(stdout).toContain("GET");
    expect(stdout).toContain("/api/deals");
  });

  test("notes create generates correct curl command", () => {
    const { stdout } = runCli([
      "notes", "create",
      "--workspaceId", VALID_WS_ID,
      "--name", "Test Note",
      "--curl",
      ...AUTH,
    ]);
    expect(stdout).toContain("-X POST");
    expect(stdout).toContain("/api/notes");
  });

  test("tasks create generates correct curl command", () => {
    const { stdout } = runCli([
      "tasks", "create",
      "--workspaceId", VALID_WS_ID,
      "--name", "Follow up",
      "--curl",
      ...AUTH,
    ]);
    expect(stdout).toContain("-X POST");
    expect(stdout).toContain("/api/tasks");
  });
});

describe("zero-cli config commands", () => {
  test("config show with no cache gives error message", () => {
    // Ensure no cache file
    try { fs.unlinkSync(TEST_CACHE); } catch {}
    const { stderr, status } = runCli(["config", "show"]);
    expect(stderr).toContain("No cached workspace configuration");
    expect(status).toBe(1);
  });

  test("config show with populated cache outputs workspace data", () => {
    const cache: GlobalCache = {
      version: CACHE_VERSION,
      syncedAt: "2026-01-01T00:00:00.000Z",
      workspaces: {
        "ws-1": {
          ...emptyWorkspaceCache(),
          name: "Test WS",
          columns: {
            "col-1": { name: "Status", type: "select", options: { "a": "Active" } },
          },
          users: { "user-1": "Alice" },
          lists: { "list-1": "VIP" },
          stages: { "stage-1": "Negotiation" },
          pipelines: { "pipe-1": "Sales" },
        },
      },
    };
    writeTestCache(cache);
    const { stdout } = runCli(["config", "show"]);
    const parsed = JSON.parse(stdout);
    expect(parsed["ws-1"].name).toBe("Test WS");
    expect(parsed["ws-1"].columns["col-1"].name).toBe("Status");
    expect(parsed["ws-1"].users["user-1"]).toBe("Alice");
    expect(parsed["ws-1"].lists["list-1"]).toBe("VIP");
    expect(parsed["ws-1"].stages["stage-1"]).toBe("Negotiation");
    expect(parsed["ws-1"].pipelines["pipe-1"]).toBe("Sales");
  });

  test("config show --columns filters to columns only", () => {
    const cache: GlobalCache = {
      version: CACHE_VERSION,
      workspaces: {
        "ws-1": {
          ...emptyWorkspaceCache(),
          name: "Test WS",
          columns: { "col-1": { name: "Status", type: "select" } },
          users: { "user-1": "Alice" },
        },
      },
    };
    writeTestCache(cache);
    const { stdout } = runCli(["config", "show", "--columns"]);
    const parsed = JSON.parse(stdout);
    expect(parsed["ws-1"].columns).toBeDefined();
    expect(parsed["ws-1"].users).toBeUndefined();
  });

  test("config show --users filters to users only", () => {
    const cache: GlobalCache = {
      version: CACHE_VERSION,
      workspaces: {
        "ws-1": {
          ...emptyWorkspaceCache(),
          name: "Test WS",
          users: { "user-1": "Alice" },
          columns: { "col-1": { name: "Status", type: "select" } },
        },
      },
    };
    writeTestCache(cache);
    const { stdout } = runCli(["config", "show", "--users"]);
    const parsed = JSON.parse(stdout);
    expect(parsed["ws-1"].users).toBeDefined();
    expect(parsed["ws-1"].columns).toBeUndefined();
  });

  test("config with no subcommand shows help", () => {
    const { stdout } = runCli(["config"]);
    expect(stdout).toContain("config show");
  });
});
