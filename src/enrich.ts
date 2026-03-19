import { type GlobalCache, type WorkspaceCache, type ColumnDef } from "./types";

export interface EnrichOptions {
  hideNulls?: boolean;
}

/**
 * Resolve a single value using a column definition and workspace cache.
 */
function resolveValue(val: any, colDef: ColumnDef | undefined, ws: WorkspaceCache): any {
  if (val === null || val === undefined) return val;

  // select/multiselect: option key → option name
  if (colDef?.options) {
    if (Array.isArray(val)) {
      return val.map((v) => colDef.options![v] ?? v);
    }
    if (typeof val === "string") {
      return colDef.options[val] ?? val;
    }
  }

  // user-type column: user UUID → user name
  if (colDef?.type === "user" && typeof val === "string") {
    return ws.users[val] ?? val;
  }

  return val;
}

/**
 * Enrich the `custom` object: column UUID keys → names, values resolved by type.
 */
function enrichCustom(
  custom: Record<string, any>,
  ws: WorkspaceCache,
  options: EnrichOptions,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [uuid, val] of Object.entries(custom)) {
    if (options.hideNulls && val === null) continue;
    const colDef = ws.columns[uuid];
    const displayKey = colDef?.name ?? uuid;
    const enrichedVal = resolveValue(val, colDef, ws);
    result[displayKey] = enrichObject(enrichedVal, { workspaces: {} } as GlobalCache, options);
  }
  return result;
}

/**
 * Enrich standard ID fields: ownerIds, listIds, assignedToIds, createdById, updatedById, stage, pipelineId.
 */
function enrichStandardField(key: string, value: any, ws: WorkspaceCache): any {
  // Array of user IDs
  if ((key === "ownerIds" || key === "assignedToIds") && Array.isArray(value)) {
    return value.map((id) => ws.users[id] ?? id);
  }
  // Array of list IDs
  if (key === "listIds" && Array.isArray(value)) {
    return value.map((id) => ws.lists[id] ?? id);
  }
  // Single user ID fields
  if ((key === "createdById" || key === "updatedById") && typeof value === "string") {
    return ws.users[value] ?? value;
  }
  // Deal stage UUID → stage name
  if (key === "stage" && typeof value === "string") {
    return ws.stages[value] ?? value;
  }
  // Deal pipeline UUID → pipeline name
  if (key === "pipelineId" && typeof value === "string") {
    return ws.pipelines[value] ?? value;
  }
  return value;
}

/**
 * Recursively enrich an API response object.
 */
export function enrichObject(obj: any, cache: GlobalCache, options: EnrichOptions = {}, currentWsId?: string): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => enrichObject(item, cache, options, currentWsId));
  }

  if (obj !== null && typeof obj === "object") {
    const wsId = obj.workspaceId ?? currentWsId;
    const ws = wsId ? cache.workspaces[wsId] : undefined;
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (options.hideNulls && value === null) continue;

      // Custom fields enrichment
      if (key === "custom" && value !== null && typeof value === "object" && !Array.isArray(value) && ws) {
        result[key] = enrichCustom(value as Record<string, any>, ws, options);
        continue;
      }

      // Standard ID field enrichment
      let enrichedValue = ws ? enrichStandardField(key, value, ws) : value;

      // Recurse into nested objects/arrays
      result[key] = enrichObject(enrichedValue, cache, options, wsId);
    }
    return result;
  }

  return obj;
}
