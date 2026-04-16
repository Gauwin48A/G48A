const express = require("express");
const request = require("supertest");
const reliabilityRoutes = require("../src/routes/reliability");
const { resetForTests } = require("../src/services/reliabilityOpsService");

function withEnv(overrides, testFn) {
  const previous = {};
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    if (value === undefined || value === null) {
      delete process.env[key];
    } else {
      process.env[key] = String(value);
    }
  }

  return Promise.resolve()
    .then(testFn)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/reliability", reliabilityRoutes);
  return app;
}

describe("reliability routes", () => {
  beforeEach(() => {
    resetForTests();
  });

  it("registers SLO and records availability sample", async () =>
    withEnv(
      {
        RELIABILITY_ADMIN_TOKEN: "rel-admin",
      },
      async () => {
        const app = buildApp();
        const register = await request(app)
          .post("/api/reliability/slos/register")
          .set("x-reliability-admin-token", "rel-admin")
          .send({
            serviceName: "telemetry-ingest",
            targetPercent: 99.9,
            windowDays: 30,
          });
        expect(register.status).toBe(201);
        expect(register.body.status).toBe("registered");

        const sample = await request(app)
          .post("/api/reliability/slos/availability-sample")
          .set("x-reliability-admin-token", "rel-admin")
          .send({
            serviceName: "telemetry-ingest",
            minutesObserved: 120,
            minutesError: 2,
          });
        expect(sample.status).toBe(200);
        expect(sample.body.status).toBe("recorded");
        expect(sample.body.slo.consumedErrorMinutes).toBe(2);

        const lookup = await request(app)
          .get("/api/reliability/slos/telemetry-ingest")
          .set("x-reliability-admin-token", "rel-admin");
        expect(lookup.status).toBe(200);
        expect(lookup.body.slo.serviceName).toBe("telemetry-ingest");
      }
    ));

  it("ingests traces, runs chaos and backup drills", async () =>
    withEnv(
      {
        RELIABILITY_ADMIN_TOKEN: "rel-admin",
      },
      async () => {
        const app = buildApp();
        const trace = await request(app)
          .post("/api/reliability/observability/traces")
          .set("x-reliability-admin-token", "rel-admin")
          .send({
            serviceName: "api-gateway",
            traceId: "trace-1",
            severity: "warn",
            latencyMs: 240,
          });
        expect(trace.status).toBe(201);
        expect(trace.body.status).toBe("ingested");

        const chaos = await request(app)
          .post("/api/reliability/chaos/run")
          .set("x-reliability-admin-token", "rel-admin")
          .send({
            name: "redis-latency-injection",
            scope: "cache",
            failureType: "latency",
            observedPassPercent: 99,
          });
        expect(chaos.status).toBe(200);
        expect(chaos.body.status).toBe("executed");
        expect(chaos.body.run.status).toBe("PASS");

        const drill = await request(app)
          .post("/api/reliability/drills/backup-restore")
          .set("x-reliability-admin-token", "rel-admin")
          .send({
            region: "ap-south",
            rtoMinutes: 20,
            rpoMinutes: 4,
          });
        expect(drill.status).toBe(200);
        expect(drill.body.drill.status).toBe("PASS");
      }
    ));

  it("opens incident and publishes postmortem", async () =>
    withEnv(
      {
        RELIABILITY_ADMIN_TOKEN: "rel-admin",
      },
      async () => {
        const app = buildApp();
        const open = await request(app)
          .post("/api/reliability/incidents/open")
          .set("x-reliability-admin-token", "rel-admin")
          .send({
            title: "Telemetry delay spike",
            severity: "SEV1",
            commanderId: "sre-1",
          });
        expect(open.status).toBe(201);
        const incidentId = open.body.incident.incidentId;

        const postmortem = await request(app)
          .post(`/api/reliability/incidents/${incidentId}/postmortem`)
          .set("x-reliability-admin-token", "rel-admin")
          .send({
            summary: "Queue backpressure due to burst traffic.",
            actionItems: ["Increase consumer concurrency", "Tune queue alerts"],
          });
        expect(postmortem.status).toBe(200);
        expect(postmortem.body.status).toBe("published");
        expect(postmortem.body.incident.status).toBe("CLOSED");

        const summary = await request(app)
          .get("/api/reliability/summary")
          .set("x-reliability-admin-token", "rel-admin");
        expect(summary.status).toBe(200);
        expect(summary.body.summary).toHaveProperty("slosTracked");
      }
    ));
});
