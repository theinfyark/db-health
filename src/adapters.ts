import type { PoolMetrics } from "./types.js";

/** Duck-typed helpers for popular drivers — no hard dependency on pg/mysql/mongo/redis. */

export interface PgLikePool {
  query: (text: string) => Promise<unknown>;
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
}

export interface MysqlLikePool {
  query: (sql: string) => Promise<unknown>;
  pool?: {
    _allConnections?: { length: number };
    _freeConnections?: { length: number };
    _connectionQueue?: { length: number };
  };
}

export interface MongoLikeClient {
  db: (name?: string) => { command: (cmd: Record<string, unknown>) => Promise<unknown> };
}

export interface RedisLikeClient {
  ping: () => Promise<string>;
}

export function postgres(pool: PgLikePool, options: { name?: string; optional?: boolean; timeoutMs?: number } = {}) {
  return {
    name: options.name ?? "postgres",
    kind: "postgres" as const,
    optional: options.optional,
    timeoutMs: options.timeoutMs,
    check: async () => {
      await pool.query("SELECT 1");
    },
    pool: (): PoolMetrics => {
      const total = pool.totalCount;
      const idle = pool.idleCount;
      const waiting = pool.waitingCount;
      return {
        ...(total !== undefined ? { total } : {}),
        ...(idle !== undefined ? { idle } : {}),
        ...(waiting !== undefined ? { waiting } : {}),
        ...(total !== undefined && idle !== undefined
          ? { active: Math.max(total - idle, 0) }
          : {}),
      };
    },
  };
}

export function mysql(pool: MysqlLikePool, options: { name?: string; optional?: boolean; timeoutMs?: number } = {}) {
  return {
    name: options.name ?? "mysql",
    kind: "mysql" as const,
    optional: options.optional,
    timeoutMs: options.timeoutMs,
    check: async () => {
      await pool.query("SELECT 1");
    },
    pool: (): PoolMetrics => {
      const total = pool.pool?._allConnections?.length;
      const idle = pool.pool?._freeConnections?.length;
      const waiting = pool.pool?._connectionQueue?.length;
      return {
        ...(total !== undefined ? { total } : {}),
        ...(idle !== undefined ? { idle } : {}),
        ...(waiting !== undefined ? { waiting } : {}),
        ...(total !== undefined && idle !== undefined
          ? { active: Math.max(total - idle, 0) }
          : {}),
      };
    },
  };
}

export function mongodb(
  client: MongoLikeClient,
  options: { name?: string; dbName?: string; optional?: boolean; timeoutMs?: number } = {},
) {
  return {
    name: options.name ?? "mongodb",
    kind: "mongodb" as const,
    optional: options.optional,
    timeoutMs: options.timeoutMs,
    check: async () => {
      await client.db(options.dbName).command({ ping: 1 });
    },
  };
}

export function redis(
  client: RedisLikeClient,
  options: { name?: string; optional?: boolean; timeoutMs?: number } = {},
) {
  return {
    name: options.name ?? "redis",
    kind: "redis" as const,
    optional: options.optional,
    timeoutMs: options.timeoutMs,
    check: async () => {
      const pong = await client.ping();
      if (String(pong).toUpperCase() !== "PONG") {
        throw new Error(`Unexpected Redis PING response: ${pong}`);
      }
    },
  };
}

export const adapters = { postgres, mysql, mongodb, redis };
