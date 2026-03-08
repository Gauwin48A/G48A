const express = require("express");
const request = require("supertest");
const telemetryRoutes = require("../src/routes/telemetry");
const { resetForTests } = require("../src/services/telemetryPipelineService");

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
  app.use("/api/telemetry", telemetryRoutes);
  return app;
}

function buildEvent(overrides = {}) {
  return {
    event_id: "event-1",
    schema_version: "1",
    event_type: "temperature.reading",
    device_id: "device-telemetry-1",
    timestamp: new Date().toISOString(),
    payload: {
      value: 21.3,
      unit: "c",
    },
    ...overrides,
  };
}

describe("telemetry routes", () => {
  beforeEach(() => {
    resetForTests();
  });

  it("accepts valid telemetry events", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "false",
        TELEMETRY_SUPPORTED_SCHEMA_VERSIONS: "1,2",
      },
      async () => {
        const app = buildApp();
        const response = await request(app).post("/api/telemetry/ingest").send({
          protocol: "http",
          events: [buildEvent()],
        });

        expect(response.status).toBe(202);
        expect(response.body.accepted).toBe(1);
        expect(response.body.replayed).toBe(0);
        expect(response.body.rejected).toBe(0);
      }
    ));

  it("marks duplicate telemetry as replayed", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "false",
        TELEMETRY_SUPPORTED_SCHEMA_VERSIONS: "1",
      },
      async () => {
        const app = buildApp();
        const payload = {
          events: [buildEvent({ event_id: "dupe-1" })],
        };

        await request(app).post("/api/telemetry/ingest").send(payload);
        const replay = await request(app).post("/api/telemetry/ingest").send(payload);

        expect(replay.status).toBe(202);
        expect(replay.body.accepted).toBe(0);
        expect(replay.body.replayed).toBe(1);
      }
    ));

  it("rejects unsupported schema versions", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "false",
        TELEMETRY_SUPPORTED_SCHEMA_VERSIONS: "1",
      },
      async () => {
        const app = buildApp();
        const response = await request(app).post("/api/telemetry/ingest").send({
          events: [buildEvent({ event_id: "schema-2", schema_version: "9" })],
        });

        expect(response.status).toBe(202);
        expect(response.body.accepted).toBe(0);
        expect(response.body.rejected).toBe(1);
        expect(response.body.rejectedReasons[0]).toMatch(/schema_version/i);
      }
    ));

  it("returns telemetry metrics", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "false",
        TELEMETRY_SUPPORTED_SCHEMA_VERSIONS: "1",
      },
      async () => {
        const app = buildApp();
        await request(app).post("/api/telemetry/ingest").send({
          events: [buildEvent({ event_id: "metrics-1" })],
        });
        const metrics = await request(app).get("/api/telemetry/metrics");

        expect(metrics.status).toBe(200);
        expect(metrics.body.status).toBe("ok");
        expect(metrics.body.metrics.hotEvents).toBeGreaterThanOrEqual(1);
      }
    ));

  it("requires replay token when configured", async () =>
    withEnv(
      {
        TELEMETRY_REPLAY_TOKEN: "replay-secret",
      },
      async () => {
        const app = buildApp();
        const unauthorized = await request(app).post("/api/telemetry/replay").send({
          events: [buildEvent({ event_id: "replay-token-1" })],
        });
        expect(unauthorized.status).toBe(401);

        const authorized = await request(app)
          .post("/api/telemetry/replay")
          .set("x-telemetry-replay-token", "replay-secret")
          .send({
            events: [buildEvent({ event_id: "replay-token-2" })],
          });
        expect(authorized.status).toBe(202);
      }
    ));

  it("registers schema definitions and enforces required payload fields", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "false",
        TELEMETRY_SUPPORTED_SCHEMA_VERSIONS: "1",
        TELEMETRY_SCHEMA_ADMIN_TOKEN: "schema-admin-secret",
      },
      async () => {
        const app = buildApp();

        const unauthorizedRegister = await request(app)
          .post("/api/telemetry/schemas/register")
          .send({
            schemaVersion: "1",
            eventType: "temperature.reading",
            requiredFields: ["sensorId"],
            optionalFields: ["value", "unit"],
          });
        expect(unauthorizedRegister.status).toBe(401);

        const authorizedRegister = await request(app)
          .post("/api/telemetry/schemas/register")
          .set("x-telemetry-schema-token", "schema-admin-secret")
          .send({
            schemaVersion: "1",
            eventType: "temperature.reading",
            requiredFields: ["sensorId"],
            optionalFields: ["value", "unit"],
          });
        expect(authorizedRegister.status).toBe(201);
        expect(authorizedRegister.body.status).toBe("registered");

        const missingRequired = await request(app).post("/api/telemetry/ingest").send({
          events: [buildEvent({ event_id: "schema-required-1", payload: { value: 22.2, unit: "c" } })],
        });
        expect(missingRequired.status).toBe(202);
        expect(missingRequired.body.accepted).toBe(0);
        expect(missingRequired.body.rejected).toBe(1);
        expect(missingRequired.body.rejectedReasons[0]).toMatch(/Missing required payload fields/i);

        const withRequired = await request(app).post("/api/telemetry/ingest").send({
          events: [
            buildEvent({
              event_id: "schema-required-2",
              payload: { sensorId: "sensor-1", value: 22.2, unit: "c" },
            }),
          ],
        });
        expect(withRequired.status).toBe(202);
        expect(withRequired.body.accepted).toBe(1);
      }
    ));

  it("can deprecate and activate schema versions through admin endpoints", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "false",
        TELEMETRY_SUPPORTED_SCHEMA_VERSIONS: "1",
        TELEMETRY_SCHEMA_ADMIN_TOKEN: "schema-admin-secret",
      },
      async () => {
        const app = buildApp();

        const deprecated = await request(app)
          .post("/api/telemetry/schemas/deprecate")
          .set("x-telemetry-schema-token", "schema-admin-secret")
          .send({ schemaVersion: "1" });
        expect(deprecated.status).toBe(200);
        expect(deprecated.body.status).toBe("deprecated");

        const rejectedOnDeprecated = await request(app).post("/api/telemetry/ingest").send({
          events: [buildEvent({ event_id: "deprecated-reject-1" })],
        });
        expect(rejectedOnDeprecated.status).toBe(202);
        expect(rejectedOnDeprecated.body.accepted).toBe(0);
        expect(rejectedOnDeprecated.body.rejected).toBe(1);

        const activated = await request(app)
          .post("/api/telemetry/schemas/activate")
          .set("x-telemetry-schema-token", "schema-admin-secret")
          .send({ schemaVersion: "1" });
        expect(activated.status).toBe(200);
        expect(activated.body.status).toBe("activated");
      }
    ));
});
