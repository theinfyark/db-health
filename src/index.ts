export { DbHealth } from "./health.js";
export { probeTarget } from "./probe.js";
export { adapters, postgres, mysql, mongodb, redis } from "./adapters.js";
export type {
  PgLikePool,
  MysqlLikePool,
  MongoLikeClient,
  RedisLikeClient,
} from "./adapters.js";

export type {
  DbKind,
  PoolMetrics,
  DbTarget,
  CheckStatus,
  TargetResult,
  HealthReport,
  DbHealthOptions,
} from "./types.js";
