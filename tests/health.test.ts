import { describe, it, expect } from "vitest";
import { DbHealth, adapters } from "../src/index.js";

describe("db-health", () => {
  it("reports up when all targets pass", async () => {
    const health = new DbHealth({
      targets: [
        adapters.postgres({
          query: async () => ({ rows: [{ ok: 1 }] }),
          totalCount: 5,
          idleCount: 2,
          waitingCount: 0,
        }),
        adapters.redis({
          ping: async () => "PONG",
        }),
      ],
    });

    const report = await health.check();
    expect(report.status).toBe("up");
    expect(report.ready).toBe(true);
    expect(report.targets).toHaveLength(2);
    expect(report.targets[0]?.pool?.active).toBe(3);
    expect(report.targets.every((t) => t.latencyMs >= 0)).toBe(true);
  });

  it("marks readiness false when required target is down", async () => {
    const health = new DbHealth({
      targets: [
        {
          kind: "postgres",
          name: "primary",
          check: async () => {
            throw new Error("connection refused");
          },
        },
        adapters.redis(
          {
            ping: async () => "PONG",
          },
          { optional: true },
        ),
      ],
    });

    const ready = await health.readiness();
    expect(ready.ready).toBe(false);
    expect(ready.targets.find((t) => t.name === "primary")?.status).toBe("down");
  });

  it("treats optional failures as degraded", async () => {
    const health = new DbHealth({
      targets: [
        adapters.mysql({
          query: async () => [[{ ok: 1 }]],
        }),
        {
          kind: "mongodb",
          name: "analytics",
          optional: true,
          check: async () => {
            throw new Error("mongo down");
          },
        },
      ],
    });

    const report = await health.check();
    expect(report.ready).toBe(true);
    expect(report.status).toBe("degraded");
    expect(report.targets.find((t) => t.name === "analytics")?.status).toBe(
      "degraded",
    );
  });

  it("supports mongodb and redis adapters", async () => {
    const health = new DbHealth({
      targets: [
        adapters.mongodb({
          db: () => ({
            command: async () => ({ ok: 1 }),
          }),
        }),
        adapters.redis({
          ping: async () => "PONG",
        }),
      ],
    });

    const report = await health.check();
    expect(report.status).toBe("up");
    expect(report.targets.map((t) => t.kind).sort()).toEqual([
      "mongodb",
      "redis",
    ]);
  });

  it("times out slow targets", async () => {
    const health = new DbHealth({
      timeoutMs: 50,
      targets: [
        {
          kind: "postgres",
          name: "slow",
          check: async () => {
            await new Promise((r) => setTimeout(r, 200));
          },
        },
      ],
    });

    const report = await health.check();
    expect(report.ready).toBe(false);
    expect(report.targets[0]?.error).toMatch(/timed out/i);
  });

  it("health handler returns 200/503 JSON", async () => {
    const health = new DbHealth({
      targets: [
        {
          kind: "redis",
          check: async () => {
            throw new Error("down");
          },
        },
      ],
    });

    const res = {
      code: 0,
      body: null as unknown,
      status(code: number) {
        this.code = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
    };

    await health.handler("ready")({}, res);
    expect(res.code).toBe(503);
    expect((res.body as { ready: boolean }).ready).toBe(false);

    const live = {
      code: 0,
      body: null as unknown,
      status(code: number) {
        this.code = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
    };
    await health.handler("live")({}, live);
    expect(live.code).toBe(200);
  });

  it("requires at least one target", () => {
    expect(() => new DbHealth({ targets: [] })).toThrow(/at least one/i);
  });
});
