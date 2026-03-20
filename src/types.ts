export interface ColumnOption {
  key: string;
  name: string;
}

export interface ColumnDef {
  name: string;
  type: string;
  entity?: string;
  options?: Record<string, string>; // option key UUID → display name
}

export interface PipelineDef {
  name: string;
  stages: Record<string, string>;           // stage UUID → display name
}

export interface WorkspaceCache {
  name?: string;
  columns: Record<string, ColumnDef>;       // column UUID → definition
  users: Record<string, string>;            // user UUID → display name
  lists: Record<string, string>;            // list UUID → display name
  stages: Record<string, string>;           // stage UUID → display name (flat lookup)
  pipelines: Record<string, PipelineDef>;   // pipeline UUID → definition with stages
}

export interface GlobalCache {
  version: number;
  syncedAt?: string;  // ISO 8601 timestamp of last sync
  workspaces: Record<string, WorkspaceCache>;
}

export const CACHE_VERSION = 2;

export function emptyWorkspaceCache(): WorkspaceCache {
  return {
    columns: {},
    users: {},
    lists: {},
    stages: {},
    pipelines: {},
  };
}

export function emptyGlobalCache(): GlobalCache {
  return {
    version: CACHE_VERSION,
    workspaces: {},
  };
}
