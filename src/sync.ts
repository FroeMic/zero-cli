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
 * Sync pipelines and pipeline stages from expanded workspace data.
 */
export function syncPipelinesFromData(workspaces: any[], cache: GlobalCache): { pipelines: number; stages: number } {
  let pipelines = 0, stages = 0;
  for (const ws of workspaces) {
    if (!ws.id) continue;
    const cached = getWorkspace(cache, ws.id);
    if (!Array.isArray(ws.pipelines)) continue;
    for (const pipeline of ws.pipelines) {
      if (!pipeline.id || !pipeline.name) continue;
      const pipelineDef = { name: pipeline.name, stages: {} as Record<string, string> };
      pipelines++;
      if (Array.isArray(pipeline.pipelineStages)) {
        for (const stage of pipeline.pipelineStages) {
          if (stage.id && stage.name) {
            pipelineDef.stages[stage.id] = stage.name;
            cached.stages[stage.id] = stage.name;
            stages++;
          }
        }
      }
      cached.pipelines[pipeline.id] = pipelineDef;
    }
  }
  return { pipelines, stages };
}

/**
 * Sync users from expanded workspace memberships data.
 */
export function syncUsersFromData(workspaces: any[], cache: GlobalCache): number {
  let count = 0;
  for (const ws of workspaces) {
    if (!ws.id) continue;
    const cached = getWorkspace(cache, ws.id);
    if (!Array.isArray(ws.memberships)) continue;
    for (const membership of ws.memberships) {
      const user = membership.user;
      if (user && user.id && user.name) {
        cached.users[user.id] = user.name;
        count++;
      }
    }
  }
  return count;
}

/**
 * Sync lists from expanded workspace data.
 */
export function syncListsFromData(workspaces: any[], cache: GlobalCache): number {
  let count = 0;
  for (const ws of workspaces) {
    if (!ws.id) continue;
    const cached = getWorkspace(cache, ws.id);
    if (!Array.isArray(ws.lists)) continue;
    for (const list of ws.lists) {
      if (list.id && list.name) {
        cached.lists[list.id] = list.name;
        count++;
      }
    }
  }
  return count;
}
