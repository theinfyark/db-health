import type {
  CheckStatus,
  DbHealthOptions,
  DbTarget,
  HealthReport,
  TargetResult,
} from "./types.js";
import { probeTarget } from "./probe.js";

function overallStatus(targets: TargetResult[]): CheckStatus {
  if (targets.some((t) => t.status === "down")) return "down";
  if (targets.some((t) => t.status === "degraded")) return "degraded";
  return "up";
}

/**
 * Database health monitoring toolkit.
 *
 * @example
 * ```ts
 * import { DbHealth, adapters } from "db-health";
 *
 * const health = new DbHealth({
 *   targets: [
 *     adapters.postgres(pool),
 *     adapters.redis(redis),
 *   ],
 * });
 *
 * app.get("/health", health.handler());
 * ```
 */
export class DbHealth {
  private readonly targets: DbTarget[];
  private readonly timeoutMs: number;

  constructor(options: DbHealthOptions) {
    if (!options?.targets?.length) {
      throw new Error("DbHealth requires at least one target");
    }
    this.targets = options.targets;
    this.timeoutMs = options.timeoutMs ?? 3000;
  }

  /** Full health report (all targets). */
  async check(): Promise<HealthReport> {
    const started = Date.now();
    const targets = await Promise.all(
      this.targets.map((t) => probeTarget(t, this.timeoutMs)),
    );
    const status = overallStatus(targets);
    return {
      status,
      ready: targets.every((t) => t.status === "up" || t.optional),
      live: true,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      targets,
    };
  }

  /**
   * Readiness — fails if any required target is down.
   * Optional targets may be degraded without failing readiness.
   */
  async readiness(): Promise<HealthReport> {
    const report = await this.check();
    return {
      ...report,
      status: report.ready ? (report.status === "down" ? "degraded" : report.status) : "down",
      live: true,
    };
  }

  /**
   * Liveness — process is up (does not require DBs).
   * Still includes latest optional probe snapshot when requested.
   */
  async liveness(): Promise<HealthReport> {
    return {
      status: "up",
      ready: true,
      live: true,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
      targets: [],
    };
  }

  /**
   * Express / Connect / Node HTTP-compatible middleware.
   * Returns 200 when ready, 503 when not.
   */
  handler(kind: "health" | "ready" | "live" = "health") {
    return async (
      _req: unknown,
      res: {
        statusCode?: number;
        status?: (code: number) => { json: (body: unknown) => unknown };
        json?: (body: unknown) => unknown;
        end?: (body: string) => unknown;
        setHeader?: (k: string, v: string) => void;
      },
    ) => {
      const report =
        kind === "live"
          ? await this.liveness()
          : kind === "ready"
            ? await this.readiness()
            : await this.check();

      const code = (kind === "live" ? report.live : report.ready) ? 200 : 503;

      if (typeof res.status === "function") {
        return res.status(code).json(report);
      }

      res.statusCode = code;
      res.setHeader?.("content-type", "application/json; charset=utf-8");
      if (typeof res.json === "function") return res.json(report);
      return res.end?.(JSON.stringify(report));
    };
  }
}
