import { test, expect, describe } from "bun:test";
import { enrichObject } from "../src/enrich";
import { type GlobalCache, emptyGlobalCache, emptyWorkspaceCache } from "../src/types";

function makeCache(): GlobalCache {
  const cache = emptyGlobalCache();
  cache.workspaces["ws-1"] = {
    ...emptyWorkspaceCache(),
    name: "Test Workspace",
    columns: {
      "col-select": {
        name: "Status",
        type: "select",
        options: { "opt-a": "Active", "opt-b": "Closed" },
      },
      "col-multiselect": {
        name: "Tags",
        type: "multiselect",
        options: { "tag-1": "VIP", "tag-2": "Enterprise", "tag-3": "SMB" },
      },
      "col-user": {
        name: "Account Manager",
        type: "user",
      },
      "col-text": {
        name: "Notes",
        type: "text",
      },
      "col-number": {
        name: "Revenue",
        type: "number",
      },
    },
    users: {
      "user-1": "Alice",
      "user-2": "Bob",
      "user-3": "Charlie",
    },
    lists: {
      "list-1": "VIP Clients",
      "list-2": "New Leads",
    },
    stages: {
      "stage-1": "Negotiation",
      "stage-2": "Closed Won",
    },
    pipelines: {
      "pipe-1": "Sales Pipeline",
    },
  };
  return cache;
}

describe("enrichObject — custom fields", () => {
  test("resolves select option UUID to display name", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", custom: { "col-select": "opt-a" } };
    const result = enrichObject(obj, cache);
    expect(result.custom["Status"]).toBe("Active");
  });

  test("resolves multiselect option UUIDs to display names", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", custom: { "col-multiselect": ["tag-1", "tag-3"] } };
    const result = enrichObject(obj, cache);
    expect(result.custom["Tags"]).toEqual(["VIP", "SMB"]);
  });

  test("resolves user-type column UUID to user name", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", custom: { "col-user": "user-2" } };
    const result = enrichObject(obj, cache);
    expect(result.custom["Account Manager"]).toBe("Bob");
  });

  test("passes through text values unchanged", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", custom: { "col-text": "some notes" } };
    const result = enrichObject(obj, cache);
    expect(result.custom["Notes"]).toBe("some notes");
  });

  test("passes through number values unchanged", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", custom: { "col-number": 50000 } };
    const result = enrichObject(obj, cache);
    expect(result.custom["Revenue"]).toBe(50000);
  });

  test("leaves unknown column UUIDs as-is for key", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", custom: { "unknown-col": "some-value" } };
    const result = enrichObject(obj, cache);
    expect(result.custom["unknown-col"]).toBe("some-value");
  });

  test("leaves unknown option UUIDs as-is for value", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", custom: { "col-select": "unknown-opt" } };
    const result = enrichObject(obj, cache);
    expect(result.custom["Status"]).toBe("unknown-opt");
  });

  test("leaves unknown user UUID as-is for user-type column", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", custom: { "col-user": "unknown-user" } };
    const result = enrichObject(obj, cache);
    expect(result.custom["Account Manager"]).toBe("unknown-user");
  });
});

describe("enrichObject — standard ID fields", () => {
  test("resolves ownerIds array to user names", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", ownerIds: ["user-1", "user-2"] };
    const result = enrichObject(obj, cache);
    expect(result.ownerIds).toEqual(["Alice", "Bob"]);
  });

  test("resolves assignedToIds array to user names", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", assignedToIds: ["user-3"] };
    const result = enrichObject(obj, cache);
    expect(result.assignedToIds).toEqual(["Charlie"]);
  });

  test("resolves listIds array to list names", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", listIds: ["list-1", "list-2"] };
    const result = enrichObject(obj, cache);
    expect(result.listIds).toEqual(["VIP Clients", "New Leads"]);
  });

  test("resolves createdById to user name", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", createdById: "user-1" };
    const result = enrichObject(obj, cache);
    expect(result.createdById).toBe("Alice");
  });

  test("resolves updatedById to user name", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", updatedById: "user-2" };
    const result = enrichObject(obj, cache);
    expect(result.updatedById).toBe("Bob");
  });

  test("leaves unknown user IDs as-is", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", ownerIds: ["unknown-user"], createdById: "unknown-user" };
    const result = enrichObject(obj, cache);
    expect(result.ownerIds).toEqual(["unknown-user"]);
    expect(result.createdById).toBe("unknown-user");
  });
});

describe("enrichObject — deal stage/pipeline", () => {
  test("resolves stage UUID to stage name", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", stage: "stage-1" };
    const result = enrichObject(obj, cache);
    expect(result.stage).toBe("Negotiation");
  });

  test("resolves pipelineId to pipeline name", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", pipelineId: "pipe-1" };
    const result = enrichObject(obj, cache);
    expect(result.pipelineId).toBe("Sales Pipeline");
  });

  test("leaves unknown stage/pipeline UUIDs as-is", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", stage: "unknown-stage", pipelineId: "unknown-pipe" };
    const result = enrichObject(obj, cache);
    expect(result.stage).toBe("unknown-stage");
    expect(result.pipelineId).toBe("unknown-pipe");
  });
});

describe("enrichObject — hideNulls", () => {
  test("removes null values when hideNulls is true", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", name: "Test", description: null, phone: null };
    const result = enrichObject(obj, cache, { hideNulls: true });
    expect(result.name).toBe("Test");
    expect("description" in result).toBe(false);
    expect("phone" in result).toBe(false);
  });

  test("removes null custom field values when hideNulls is true", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", custom: { "col-text": null, "col-select": "opt-a" } };
    const result = enrichObject(obj, cache, { hideNulls: true });
    expect("Notes" in result.custom).toBe(false);
    expect(result.custom["Status"]).toBe("Active");
  });

  test("keeps null values when hideNulls is false", () => {
    const cache = makeCache();
    const obj = { workspaceId: "ws-1", name: "Test", description: null };
    const result = enrichObject(obj, cache, { hideNulls: false });
    expect(result.description).toBeNull();
  });
});

describe("enrichObject — nested/recursive", () => {
  test("enriches arrays of objects", () => {
    const cache = makeCache();
    const data = [
      { workspaceId: "ws-1", ownerIds: ["user-1"] },
      { workspaceId: "ws-1", ownerIds: ["user-2"] },
    ];
    const result = enrichObject(data, cache);
    expect(result[0].ownerIds).toEqual(["Alice"]);
    expect(result[1].ownerIds).toEqual(["Bob"]);
  });

  test("inherits workspaceId from parent for nested objects", () => {
    const cache = makeCache();
    const obj = {
      workspaceId: "ws-1",
      data: [{ ownerIds: ["user-1"] }],
    };
    const result = enrichObject(obj, cache);
    expect(result.data[0].ownerIds).toEqual(["Alice"]);
  });

  test("handles objects without workspaceId (no enrichment)", () => {
    const cache = makeCache();
    const obj = { ownerIds: ["user-1"], stage: "stage-1" };
    const result = enrichObject(obj, cache);
    // No workspace context, so no enrichment
    expect(result.ownerIds).toEqual(["user-1"]);
    expect(result.stage).toBe("stage-1");
  });
});
