import { expect, test, describe } from "bun:test";
import { spawnSync } from "node:child_process";

const CLI_PATH = "./bin/zero-cli";
const AUTH = ["--bearer-token", "token"];
const VALID_WS_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("zero-cli functional tests (curl)", () => {
  test("workspaces list should generate correct curl command", () => {
    const { stdout } = spawnSync(CLI_PATH, ["workspaces", "list", "--curl", ...AUTH]);
    const output = stdout.toString();
    
    expect(output).toContain("curl -sS -X GET");
    expect(output).toContain("https://api.zero.inc/api/workspaces");
    expect(output).toContain("authorization: Bearer ***");
  });

  test("companies create should include body and workspaceId", () => {
    const { stdout } = spawnSync(CLI_PATH, [
      "companies", "create", 
      "--workspaceId", VALID_WS_ID,
      "--name", "Test Corp", 
      "--domain", "test.com", 
      "--curl",
      ...AUTH
    ]);
    const output = stdout.toString();

    expect(output).toContain("-X POST");
    expect(output).toContain(`"workspaceId":"${VALID_WS_ID}"`);
    expect(output).toContain('"name":"Test Corp"');
    expect(output).toContain('"domain":"test.com"');
  });

  test("contacts list should handle complex filters", () => {
    const where = JSON.stringify({ workspaceId: "uuid-123" });
    const { stdout } = spawnSync(CLI_PATH, [
      "contacts", "list", 
      "--where", where, 
      "--curl",
      ...AUTH
    ]);
    const output = stdout.toString();

    expect(output).toContain("GET");
    expect(output).toContain("where=" + encodeURIComponent(where));
  });

  test("companies update should generate patch with id", () => {
    const { stdout } = spawnSync(CLI_PATH, [
      "companies", "update", "company-123",
      "--name", "New Name",
      "--curl",
      ...AUTH
    ]);
    const output = stdout.toString();

    expect(output).toContain("-X PATCH");
    expect(output).toContain("https://api.zero.inc/api/companies/company-123");
    expect(output).toContain('"name":"New Name"');
  });
});
