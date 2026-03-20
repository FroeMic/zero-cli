import { test, expect, describe } from "bun:test";
import { emptyGlobalCache } from "../src/types";
import {
  extractDataArray,
  syncColumnsFromData,
  syncWorkspacesFromData,
  syncPipelinesFromData,
  syncUsersFromData,
  syncListsFromData,
  captureContext,
} from "../src/sync";

describe("extractDataArray", () => {
  test("extracts from { body: { data: [...] } }", () => {
    const result = extractDataArray({ body: { data: [1, 2, 3] } });
    expect(result).toEqual([1, 2, 3]);
  });

  test("extracts from { data: [...] }", () => {
    const result = extractDataArray({ data: [4, 5] });
    expect(result).toEqual([4, 5]);
  });

  test("returns raw array if already an array", () => {
    const result = extractDataArray([1, 2]);
    expect(result).toEqual([1, 2]);
  });

  test("returns empty array for null/undefined", () => {
    expect(extractDataArray(null)).toEqual([]);
    expect(extractDataArray(undefined)).toEqual([]);
  });

  test("returns empty array for non-array data", () => {
    expect(extractDataArray({ data: "string" })).toEqual([]);
  });
});

describe("syncColumnsFromData", () => {
  test("stores column definitions with name, type, entity", () => {
    const cache = emptyGlobalCache();
    const data = [
      { id: "col-1", name: "Status", type: "select", entity: "companies", workspaceId: "ws-1" },
      { id: "col-2", name: "Revenue", type: "currency", entity: "companies", workspaceId: "ws-1" },
    ];
    const count = syncColumnsFromData(data, cache);
    expect(count).toBe(2);
    expect(cache.workspaces["ws-1"].columns["col-1"]).toEqual({
      name: "Status",
      type: "select",
      entity: "companies",
    });
    expect(cache.workspaces["ws-1"].columns["col-2"]).toEqual({
      name: "Revenue",
      type: "currency",
      entity: "companies",
    });
  });

  test("stores select/multiselect options as key→name map", () => {
    const cache = emptyGlobalCache();
    const data = [
      {
        id: "col-1",
        name: "Stage",
        type: "select",
        entity: "deals",
        workspaceId: "ws-1",
        options: [
          { key: "opt-a", name: "Active", color: "#00ff00" },
          { key: "opt-b", name: "Closed", color: "#ff0000" },
        ],
      },
    ];
    syncColumnsFromData(data, cache);
    expect(cache.workspaces["ws-1"].columns["col-1"].options).toEqual({
      "opt-a": "Active",
      "opt-b": "Closed",
    });
  });

  test("skips columns without id, name, or workspaceId", () => {
    const cache = emptyGlobalCache();
    const data = [
      { id: "col-1", name: "Valid", type: "text", workspaceId: "ws-1" },
      { id: "col-2", type: "text", workspaceId: "ws-1" },  // no name
      { name: "No ID", type: "text", workspaceId: "ws-1" }, // no id
      { id: "col-3", name: "No WS", type: "text" },         // no workspaceId
    ];
    const count = syncColumnsFromData(data, cache);
    expect(count).toBe(1);
  });

  test("preserves different column types", () => {
    const cache = emptyGlobalCache();
    const types = ["text", "richtext", "number", "currency", "date", "timestamp",
      "select", "multiselect", "boolean", "url", "email", "phone", "user",
      "company", "companies", "contact", "contacts"];
    const data = types.map((type, i) => ({
      id: `col-${i}`, name: `Col ${i}`, type, workspaceId: "ws-1",
    }));
    syncColumnsFromData(data, cache);
    for (let i = 0; i < types.length; i++) {
      expect(cache.workspaces["ws-1"].columns[`col-${i}`].type).toBe(types[i]);
    }
  });

  test("columns from different workspaces go to correct caches", () => {
    const cache = emptyGlobalCache();
    const data = [
      { id: "col-1", name: "A", type: "text", workspaceId: "ws-1" },
      { id: "col-2", name: "B", type: "text", workspaceId: "ws-2" },
    ];
    syncColumnsFromData(data, cache);
    expect(cache.workspaces["ws-1"].columns["col-1"].name).toBe("A");
    expect(cache.workspaces["ws-2"].columns["col-2"].name).toBe("B");
    expect(cache.workspaces["ws-1"].columns["col-2"]).toBeUndefined();
  });
});

describe("syncWorkspacesFromData", () => {
  test("stores workspace names", () => {
    const cache = emptyGlobalCache();
    const data = [
      { id: "ws-1", name: "Workspace One" },
      { id: "ws-2", name: "Workspace Two" },
    ];
    const count = syncWorkspacesFromData(data, cache);
    expect(count).toBe(2);
    expect(cache.workspaces["ws-1"].name).toBe("Workspace One");
    expect(cache.workspaces["ws-2"].name).toBe("Workspace Two");
  });

  test("skips entries without id", () => {
    const cache = emptyGlobalCache();
    const count = syncWorkspacesFromData([{ name: "No ID" }], cache);
    expect(count).toBe(0);
  });
});

describe("syncPipelinesFromData", () => {
  test("extracts pipelines and stages from expanded workspace data", () => {
    const cache = emptyGlobalCache();
    const data = [
      {
        id: "ws-1",
        name: "Workspace One",
        pipelines: [
          {
            id: "pipe-1",
            name: "Founder Pipeline",
            pipelineStages: [
              { id: "stage-1", name: "Lead" },
              { id: "stage-2", name: "Meeting" },
              { id: "stage-3", name: "Closed Won" },
            ],
          },
          {
            id: "pipe-2",
            name: "Sales Pipeline",
            pipelineStages: [
              { id: "stage-4", name: "Prospecting" },
            ],
          },
        ],
      },
    ];
    const counts = syncPipelinesFromData(data, cache);
    expect(counts).toEqual({ pipelines: 2, stages: 4 });
    expect(cache.workspaces["ws-1"].pipelines["pipe-1"]).toBe("Founder Pipeline");
    expect(cache.workspaces["ws-1"].pipelines["pipe-2"]).toBe("Sales Pipeline");
    expect(cache.workspaces["ws-1"].stages["stage-1"]).toBe("Lead");
    expect(cache.workspaces["ws-1"].stages["stage-3"]).toBe("Closed Won");
  });

  test("handles pipelines with no stages", () => {
    const cache = emptyGlobalCache();
    const data = [
      {
        id: "ws-1",
        pipelines: [{ id: "pipe-1", name: "Empty Pipeline" }],
      },
    ];
    const counts = syncPipelinesFromData(data, cache);
    expect(counts).toEqual({ pipelines: 1, stages: 0 });
    expect(cache.workspaces["ws-1"].pipelines["pipe-1"]).toBe("Empty Pipeline");
  });

  test("skips workspaces without id or pipelines", () => {
    const cache = emptyGlobalCache();
    const data = [
      { name: "No ID", pipelines: [{ id: "p-1", name: "P" }] },
      { id: "ws-1" }, // no pipelines field
    ];
    const counts = syncPipelinesFromData(data, cache);
    expect(counts).toEqual({ pipelines: 0, stages: 0 });
  });

  test("handles multiple workspaces", () => {
    const cache = emptyGlobalCache();
    const data = [
      {
        id: "ws-1",
        pipelines: [{ id: "pipe-1", name: "P1", pipelineStages: [{ id: "s-1", name: "S1" }] }],
      },
      {
        id: "ws-2",
        pipelines: [{ id: "pipe-2", name: "P2", pipelineStages: [{ id: "s-2", name: "S2" }] }],
      },
    ];
    syncPipelinesFromData(data, cache);
    expect(cache.workspaces["ws-1"].pipelines["pipe-1"]).toBe("P1");
    expect(cache.workspaces["ws-2"].pipelines["pipe-2"]).toBe("P2");
    expect(cache.workspaces["ws-1"].stages["s-2"]).toBeUndefined();
  });
});

describe("syncUsersFromData", () => {
  test("extracts users from memberships.user", () => {
    const cache = emptyGlobalCache();
    const data = [
      {
        id: "ws-1",
        memberships: [
          { user: { id: "user-1", name: "Alice" } },
          { user: { id: "user-2", name: "Bob" } },
        ],
      },
    ];
    const count = syncUsersFromData(data, cache);
    expect(count).toBe(2);
    expect(cache.workspaces["ws-1"].users["user-1"]).toBe("Alice");
    expect(cache.workspaces["ws-1"].users["user-2"]).toBe("Bob");
  });

  test("skips memberships without user object", () => {
    const cache = emptyGlobalCache();
    const data = [
      {
        id: "ws-1",
        memberships: [
          { role: "admin" }, // no user
          { user: { id: "user-1", name: "Alice" } },
          { user: { name: "No ID" } }, // no id
        ],
      },
    ];
    const count = syncUsersFromData(data, cache);
    expect(count).toBe(1);
  });

  test("handles workspaces without memberships", () => {
    const cache = emptyGlobalCache();
    const count = syncUsersFromData([{ id: "ws-1" }], cache);
    expect(count).toBe(0);
  });
});

describe("syncListsFromData", () => {
  test("extracts lists from workspace data", () => {
    const cache = emptyGlobalCache();
    const data = [
      {
        id: "ws-1",
        lists: [
          { id: "list-1", name: "VIP" },
          { id: "list-2", name: "Leads" },
        ],
      },
    ];
    const count = syncListsFromData(data, cache);
    expect(count).toBe(2);
    expect(cache.workspaces["ws-1"].lists["list-1"]).toBe("VIP");
    expect(cache.workspaces["ws-1"].lists["list-2"]).toBe("Leads");
  });

  test("skips lists without id or name", () => {
    const cache = emptyGlobalCache();
    const data = [
      {
        id: "ws-1",
        lists: [
          { id: "list-1", name: "Valid" },
          { name: "No ID" },
          { id: "list-2" }, // no name
        ],
      },
    ];
    const count = syncListsFromData(data, cache);
    expect(count).toBe(1);
  });

  test("handles workspaces without lists", () => {
    const cache = emptyGlobalCache();
    const count = syncListsFromData([{ id: "ws-1" }], cache);
    expect(count).toBe(0);
  });
});

describe("captureContext", () => {
  test("captures expanded owner objects as users", () => {
    const cache = emptyGlobalCache();
    const response = {
      data: [{
        id: "contact-1",
        name: "Jane",
        workspaceId: "ws-1",
        owners: [
          { id: "user-1", name: "Alice" },
          { id: "user-2", name: "Bob" },
        ],
      }],
    };
    captureContext(response, cache);
    expect(cache.workspaces["ws-1"].users["user-1"]).toBe("Alice");
    expect(cache.workspaces["ws-1"].users["user-2"]).toBe("Bob");
  });

  test("captures expanded list objects", () => {
    const cache = emptyGlobalCache();
    const response = {
      data: [{
        id: "contact-1",
        name: "Jane",
        workspaceId: "ws-1",
        lists: [
          { id: "list-1", name: "VIP" },
          { id: "list-2", name: "Leads" },
        ],
      }],
    };
    captureContext(response, cache);
    expect(cache.workspaces["ws-1"].lists["list-1"]).toBe("VIP");
    expect(cache.workspaces["ws-1"].lists["list-2"]).toBe("Leads");
  });

  test("captures single expanded user objects (createdBy, updatedBy)", () => {
    const cache = emptyGlobalCache();
    const response = {
      data: [{
        id: "contact-1",
        name: "Jane",
        workspaceId: "ws-1",
        createdBy: { id: "user-3", name: "Charlie" },
      }],
    };
    captureContext(response, cache);
    expect(cache.workspaces["ws-1"].users["user-3"]).toBe("Charlie");
  });

  test("captures stage and pipeline from deals", () => {
    const cache = emptyGlobalCache();
    const response = {
      data: [{
        id: "deal-1",
        name: "Big Deal",
        workspaceId: "ws-1",
        stageObject: { id: "stage-1", name: "Negotiation" },
        pipeline: { id: "pipe-1", name: "Sales Pipeline" },
      }],
    };
    captureContext(response, cache);
    expect(cache.workspaces["ws-1"].stages["stage-1"]).toBe("Negotiation");
    expect(cache.workspaces["ws-1"].pipelines["pipe-1"]).toBe("Sales Pipeline");
  });

  test("handles null/undefined gracefully", () => {
    const cache = emptyGlobalCache();
    captureContext(null, cache);
    captureContext(undefined, cache);
    expect(Object.keys(cache.workspaces)).toHaveLength(0);
  });

  test("does not misidentify companies as users (companies have domain)", () => {
    const cache = emptyGlobalCache();
    const response = {
      data: [{
        id: "company-1",
        name: "Acme Corp",
        workspaceId: "ws-1",
        email: "info@acme.com",
        domain: "acme.com",
      }],
    };
    captureContext(response, cache);
    // Should NOT be captured as a user since it has a domain field
    expect(cache.workspaces["ws-1"].users["company-1"]).toBeUndefined();
  });
});
