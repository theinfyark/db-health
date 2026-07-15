export type DbKind = "postgres" | "mysql" | "mongodb" | "redis" | (string & {});

export interface PoolMetrics {
  total?: number;
  idle?: number;
  waiting?: number;
  active?: number;
  /** Driver-specific extras */
  [key: string]: unknown;
}

export interface DbTarget {
  /** Logical name in the report, e.g. "primary-db" */
  name?: string;
  kind: DbKind;
  /** Required ping / readiness probe */
  check: () => Promise<void> | void;
  /** Optional pool metrics collector */
  pool?: () => PoolMetrics | Promise<PoolMetrics>;
  /** Soft dependency — failure becomes "degraded" not hard fail when optional */
  optional?: boolean;
  /** Per-target timeout override (ms) */
  timeoutMs?: number;
}

export type CheckStatus = "up" | "down" | "degraded";

export interface TargetResult {
  name: string;
  kind: DbKind;
  status: CheckStatus;
  latencyMs: number;
  error?: string;
  pool?: PoolMetrics;
  optional?: boolean;
}

export interface HealthReport {
  status: CheckStatus;
  ready: boolean;
  live: boolean;
  latencyMs: number;
  checkedAt: string;
  targets: TargetResult[];
}

export interface DbHealthOptions {
  targets: DbTarget[];
  /** Default probe timeout per target. Default: 3000 */
  timeoutMs?: number;
}
