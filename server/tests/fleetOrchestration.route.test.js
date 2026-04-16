const express = require("express");
const request = require("supertest");
const fleetRoutes = require("../src/routes/fleetOrchestration");
const { resetForTests, buildOtaSignature } = require("../src/services/fleetOrchestrationService");

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
  app.use("/api/fleet-orchestration", fleetRoutes);
  return app;
}

describe("fleet orchestration routes", () => {
  beforeEach(() => {
    resetForTests();
  });

  it("sends command and supports dual approval for critical actions", async () =>
    withEnv(
      {
        FLEET_ADMIN_TOKEN: "fleet-admin",
        FLEET_CRITICAL_COMMAND_REQUIRE_DUAL_APPROVAL: "true",
      },
      async () => {
        const app = buildApp();
        const send = await request(app)
          .post("/api/fleet-orchestration/commands/send")
          .set("x-fleet-admin-token", "fleet-admin")
          .send({
            deviceId: "device-c1",
            tenantId: "tenant-1",
            commandType: "reboot",
            payload: { reason: "maintenance" },
            critical: true,
            actorId: "operator-1",
          });

        expect(send.status).toBe(201);
        expect(send.body.command.status).toBe("PENDING_APPROVAL");
        const commandId = send.body.command.commandId;

        const unauthorized = await request(app)
          .post(`/api/fleet-orchestration/commands/${commandId}/approve`)
          .send({ approverId: "admin-a" });
        expect(unauthorized.status).toBe(401);

        const firstApprove = await request(app)
          .post(`/api/fleet-orchestration/commands/${commandId}/approve`)
          .set("x-fleet-admin-token", "fleet-admin")
          .send({ approverId: "admin-a" });
        expect(firstApprove.status).toBe(200);
        expect(firstApprove.body.status).toBe("partially_approved");
        expect(firstApprove.body.command.status).toBe("PENDING_APPROVAL");

        const secondApprove = await request(app)
          .post(`/api/fleet-orchestration/commands/${commandId}/approve`)
          .set("x-fleet-admin-token", "fleet-admin")
          .send({ approverId: "admin-b" });
        expect(secondApprove.status).toBe(200);
        expect(secondApprove.body.status).toBe("approved");
        expect(secondApprove.body.command.status).toBe("SENT");

        const ack = await request(app)
          .post(`/api/fleet-orchestration/commands/${commandId}/ack`)
          .set("x-fleet-admin-token", "fleet-admin")
          .send({ ackCode: "OK", details: { applied: true } });
        expect(ack.status).toBe(200);
        expect(ack.body.status).toBe("acked");
        expect(ack.body.command.status).toBe("ACKED");
      }
    ));

  it("registers signed OTA artifact and promotes rollout", async () =>
    withEnv(
      {
        FLEET_ADMIN_TOKEN: "fleet-admin",
        OTA_REQUIRE_SIGNATURE: "true",
        OTA_SIGNING_SECRET: "fleet-secret",
      },
      async () => {
        const app = buildApp();
        const version = "1.2.3";
        const checksum = "sha256:abc123";
        const signature = buildOtaSignature(version, checksum, "fleet-secret");

        const invalid = await request(app)
          .post("/api/fleet-orchestration/ota/artifacts/register")
          .set("x-fleet-admin-token", "fleet-admin")
          .send({
            version,
            checksum,
            signature: "bad",
          });
        expect(invalid.status).toBe(400);

        const register = await request(app)
          .post("/api/fleet-orchestration/ota/artifacts/register")
          .set("x-fleet-admin-token", "fleet-admin")
          .send({
            version,
            checksum,
            signature,
            metadata: { channel: "stable" },
          });
        expect(register.status).toBe(201);
        expect(register.body.status).toBe("registered");

        const create = await request(app)
          .post("/api/fleet-orchestration/ota/rollouts/create")
          .set("x-fleet-admin-token", "fleet-admin")
          .send({
            artifactVersion: version,
            targetDeviceIds: ["device-c1", "device-c2", "device-c3", "device-c4"],
            canaryPercent: 25,
          });
        expect(create.status).toBe(201);
        expect(create.body.rollout.status).toBe("CANARY");
        const rolloutId = create.body.rollout.rolloutId;

        const promote = await request(app)
          .post(`/api/fleet-orchestration/ota/rollouts/${rolloutId}/advance`)
          .set("x-fleet-admin-token", "fleet-admin")
          .send({ mode: "promote" });
        expect(promote.status).toBe(200);
        expect(promote.body.status).toBe("promoted");
        expect(promote.body.rollout.status).toBe("COMPLETED");

        const lookup = await request(app)
          .get(`/api/fleet-orchestration/ota/rollouts/${rolloutId}`)
          .set("x-fleet-admin-token", "fleet-admin");
        expect(lookup.status).toBe(200);
        expect(lookup.body.rollout.status).toBe("COMPLETED");
      }
    ));

  it("runs diagnostics and reports summary", async () =>
    withEnv(
      {
        FLEET_ADMIN_TOKEN: "fleet-admin",
      },
      async () => {
        const app = buildApp();
        const diagnostics = await request(app)
          .post("/api/fleet-orchestration/diagnostics/run")
          .set("x-fleet-admin-token", "fleet-admin")
          .send({
            deviceId: "device-c9",
            metrics: {
              batteryLevel: 9,
              offlineMinutes: 21,
              crashLoopCount: 3,
            },
          });

        expect(diagnostics.status).toBe(200);
        expect(diagnostics.body.status).toBe("completed");
        expect(diagnostics.body.diagnostics.issues).toContain("Low battery");
        expect(diagnostics.body.diagnostics.issues).toContain("Intermittent connectivity");
        expect(diagnostics.body.diagnostics.issues).toContain("Application crash loop");

        const summary = await request(app)
          .get("/api/fleet-orchestration/summary")
          .set("x-fleet-admin-token", "fleet-admin");
        expect(summary.status).toBe(200);
        expect(summary.body.status).toBe("ok");
        expect(summary.body.summary).toHaveProperty("totalCommands");
        expect(summary.body.summary).toHaveProperty("totalArtifacts");
      }
    ));
});
