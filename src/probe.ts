import type { DbTarget, PoolMetrics, TargetResult } from "./types.js";

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Probe a single database target and collect latency + pool metrics.
 */
export async function probeTarget(
  target: DbTarget,
  defaultTimeoutMs = 3000,
): Promise<TargetResult> {
  const name = target.name ?? target.kind;
  const timeoutMs = target.timeoutMs ?? defaultTimeoutMs;
  const started = Date.now();

  try {
    await withTimeout(Promise.resolve(target.check()), timeoutMs, name);
    let pool: PoolMetrics | undefined;
    if (target.pool) {
      try {
        pool = await target.pool();
      } catch {
        pool = undefined;
      }
    }

    return {
      name,
      kind: target.kind,
      status: "up",
      latencyMs: Date.now() - started,
      ...(pool ? { pool } : {}),
      ...(target.optional ? { optional: true } : {}),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      name,
      kind: target.kind,
      status: target.optional ? "degraded" : "down",
      latencyMs: Date.now() - started,
      error: message,
      ...(target.optional ? { optional: true } : {}),
    };
  }
}
