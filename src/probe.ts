import type { DbTarget, PoolMetrics, TargetResult } from "./types.js";

async function withTimeout<T>(
  factory: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  const ac = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      factory(ac.signal),
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          ac.abort();
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
    await withTimeout((signal) => Promise.resolve(target.check(signal)), timeoutMs, name);
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
