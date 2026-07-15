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

## Introduction

**db-health** helps you ship reliable Node.js / TypeScript applications with a small, focused API.

## Why this package exists

Popular stacks need small, trustworthy utilities with excellent DX. **db-health** exists to solve one problem well: clear APIs, strong typing, minimal dependencies, and production-ready defaults — without the overhead of larger frameworks.

## Installation

```bash
npm install db-health
# or
pnpm add db-health
yarn add db-health
```

Requires Node.js 18+.

## API Reference

See the exports from `db-health` and the inline TypeScript types for the full surface area. Primary entry points are documented in **Quick Start** and **Examples** above.

## Examples

Minimal usage is shown in **Quick Start**. Prefer copying those snippets first, then expand into your app’s error handling and configuration patterns.

## Advanced Examples

- Combine with environment validation, logging, and health checks in production services
- Prefer dependency injection / custom `fetch` / client injection in tests
- Keep configuration explicit; avoid hidden global state

## Framework Integration

Works with Express, Fastify, Hono, NestJS, and plain Node HTTP servers. Import ESM (or CJS where published) and call the documented APIs from route handlers, middleware, or background jobs.

## TypeScript Usage

```ts
import { /* symbols */ } from "db-health";
```

Types ship with the package (`types` / `exports.types`). Enable `strict` in your `tsconfig` for the best DX.

## Error Handling

- Fail fast with typed / named errors where provided
- Never swallow errors silently in production paths
- Prefer returning structured error payloads in HTTP layers
- Surface actionable messages (what failed + how to fix)

## Performance

- Minimal runtime work on the hot path
- Avoid unnecessary allocations and dependencies
- Tree-shakeable ESM entry points
- Prefer streaming / lazy work when dealing with large payloads

## Best Practices

- Pin major versions with SemVer ranges you trust
- Validate configuration at process startup
- Add health checks and observability around I/O
- Write tests for failure modes (timeouts, bad input, missing credentials)

## FAQ

**Does it work with ESM and CommonJS?**  
Yes where the package publishes dual exports. Prefer ESM for new projects.

**Is it production-ready?**  
Yes — tests, types, and SemVer releases are part of the maintenance model.

**How do I report a bug?**  
Open a GitHub issue using the bug template.

## Migration Guide

### From 0.x / early drafts
This package follows SemVer. Breaking changes land in major releases and are called out in `CHANGELOG.md`.

### Upgrading patch/minor
Patch and minor releases are backward compatible. Run your test suite after upgrading.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ERR_MODULE_NOT_FOUND` | Wrong Node version / bad import path | Use Node 18+ and package `exports` |
| Types not resolving | Old moduleResolution | Use `bundler` or `node16`+ |
| Auth / network failures | Missing env or blocked egress | Check credentials and firewall |
| Unexpected runtime errors | Invalid input | Validate options; read error message |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). PRs with tests and docs are welcome.

