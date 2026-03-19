import { type GlobalCache, type ColumnDef } from "./types";
import { getWorkspace } from "./cache";

/**
 * Parse the raw CLI JSON response to extract the data array.
 * Handles both `{ body: { data: [...] } }` and `{ data: [...] }` shapes.
 */
export function extractDataArray(output: any): any[] {
  if (!output) return [];
  const data = output.body?.data ?? output.data ?? output;
  return Array.isArray(data) ? data : [];
}

/**
 * Sync column definitions into the cache from raw CLI output.
 */
export function syncColumnsFromData(data: any[], cache: GlobalCache): number {
  let count = 0;
  for (const col of data) {
    if (!col.id || !col.name || !col.workspaceId) continue;

    const ws = getWorkspace(cache, col.workspaceId);
    const colDef: ColumnDef = {
      name: col.name,
      type: col.type || "unknown",
    };
    if (col.entity) {
      colDef.entity = col.entity;
    }
    if (col.options && Array.isArray(col.options)) {
      const optionsMap: Record<string, string> = {};
      for (const opt of col.options) {
        if (opt.key && opt.name) {
          optionsMap[opt.key] = opt.name;
        }
      }
      if (Object.keys(optionsMap).length > 0) {
        colDef.options = optionsMap;
      }
    }
    ws.columns[col.id] = colDef;
    count++;
  }
  return count;
}

/**
 * Sync workspace names from raw CLI output.
 */
export function syncWorkspacesFromData(data: any[], cache: GlobalCache): number {
  let count = 0;
  for (const ws of data) {
    if (!ws.id) continue;
    const cached = getWorkspace(cache, ws.id);
    if (ws.name) cached.name = ws.name;
    count++;
  }
  return count;
}

/**
 * Walk a response object tree and capture user/list/stage/pipeline context.
 */
export function captureContext(obj: any, cache: GlobalCache, currentWsId?: string): void {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    for (const item of obj) captureContext(item, cache, currentWsId);
    return;
  }

  const wsId = obj.workspaceId || currentWsId;
  if (wsId && obj.id && obj.name) {
    const ws = getWorkspace(cache, wsId);

    // Identify entity type from response hints
    if (obj.email && !obj.domain) {
      // Has email but no domain → likely a user, not a company
      ws.users[obj.id] = obj.name;
    }
  }

  // Capture owners/assignees that are expanded objects
  if (wsId) {
    const ws = getWorkspace(cache, wsId);
    for (const key of ["owners", "assignedTo", "createdBy", "updatedBy"]) {
      const val = obj[key];
      if (val && typeof val === "object" && !Array.isArray(val) && val.id && val.name) {
        ws.users[val.id] = val.name;
      }
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && item.id && item.name) {
            ws.users[item.id] = item.name;
          }
        }
      }
    }

    // Capture expanded lists
    if (Array.isArray(obj.lists)) {
      for (const item of obj.lists) {
        if (item && item.id && item.name) {
          ws.lists[item.id] = item.name;
        }
      }
    }

    // Capture stage/pipeline from deals
    if (obj.stageObject && obj.stageObject.id && obj.stageObject.name) {
      ws.stages[obj.stageObject.id] = obj.stageObject.name;
    }
    if (obj.pipeline && obj.pipeline.id && obj.pipeline.name) {
      ws.pipelines[obj.pipeline.id] = obj.pipeline.name;
    }
  }

  // Recurse into nested objects
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      captureContext(value, cache, wsId);
    }
  }
}
