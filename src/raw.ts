import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function getRawCliPath(): string {
  const exeDir = path.dirname(process.execPath);
  const paths = [
    path.join(exeDir, "zero-cli-raw"),
    path.join(import.meta.dirname, "..", "bin", "zero-cli-raw"),
    path.join(process.cwd(), "bin", "zero-cli-raw"),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return paths[0];
}

export interface RawCliResult {
  success: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
}

export function execRaw(rawCliPath: string, args: string[]): RawCliResult {
  const result = spawnSync(rawCliPath, args);
  return {
    success: result.status === 0,
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? "",
    status: result.status,
  };
}

export function execRawJson(rawCliPath: string, args: string[]): { success: boolean; data: any; error?: string } {
  const execArgs = [...args];
  if (!execArgs.includes("--json")) execArgs.push("--json");

  const result = execRaw(rawCliPath, execArgs);
  if (!result.success) {
    return { success: false, data: null, error: result.stderr || "Command failed" };
  }

  try {
    const parsed = JSON.parse(result.stdout);
    return { success: true, data: parsed };
  } catch (e) {
    return { success: false, data: null, error: `Failed to parse JSON: ${(e as Error).message}` };
  }
}
