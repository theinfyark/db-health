# db-health

Database **health monitoring toolkit** for Node.js / TypeScript.

```bash
npm install db-health
```

## Features

- PostgreSQL
- MySQL
- MongoDB
- Redis
- Connection pool metrics
- Latency measurement
- Readiness probes
- Health endpoint middleware

Zero hard dependencies — works with your existing `pg`, `mysql2`, `mongodb`, and `redis` clients via duck-typed adapters.

## Quick start

```ts
import { DbHealth, adapters } from "db-health";
import express from "express";

const health = new DbHealth({
  targets: [
    adapters.postgres(pool),
    adapters.mysql(mysqlPool),
    adapters.mongodb(mongoClient),
    adapters.redis(redis),
  ],
  timeoutMs: 3000,
});

const app = express();
app.get("/health", health.handler());
app.get("/ready", health.handler("ready"));
app.get("/live", health.handler("live"));
```

## Report shape

```json
{
  "status": "up",
  "ready": true,
  "live": true,
  "latencyMs": 12,
  "checkedAt": "2026-07-15T17:00:00.000Z",
  "targets": [
    {
      "name": "postgres",
      "kind": "postgres",
      "status": "up",
      "latencyMs": 4,
      "pool": { "total": 10, "idle": 7, "waiting": 0, "active": 3 }
    }
  ]
}
```

Statuses: `up` · `degraded` · `down`  
HTTP: **200** when ready, **503** when not.

## Optional dependencies

Mark caches / analytics DBs optional so readiness stays green:

```ts
adapters.redis(redis, { optional: true, name: "cache" });
```

Optional failures appear as `degraded` and do not fail readiness.

## Custom targets

```ts
new DbHealth({
  targets: [
    {
      name: "custom-sql",
      kind: "postgres",
      check: async () => {
        await pool.query("SELECT 1");
      },
      pool: () => ({
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
        active: pool.totalCount - pool.idleCount,
      }),
    },
  ],
});
```

## API

| API | Purpose |
|-----|---------|
| `new DbHealth({ targets })` | Create monitor |
| `check()` | Full health report |
| `readiness()` | Ready for traffic? |
| `liveness()` | Process alive |
| `handler()` | Express / HTTP middleware |
| `adapters.postgres/mysql/mongodb/redis` | Driver helpers |

## Versioning

Semantic Versioning. See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT
