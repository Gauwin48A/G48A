const express = require("express");
const request = require("supertest");
const deviceLifecycleRoutes = require("../src/routes/deviceLifecycle");
const { buildAttestationSignature } = require("../src/middleware/deviceIdentity");
const { resetForTests } = require("../src/services/deviceLifecycleService");

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
  app.use("/api/device-lifecycle", deviceLifecycleRoutes);
  return app;
}

function attestationHeaders({ deviceId, secret, timestampMs = Date.now(), idempotencyKey = null }) {
  const signature = buildAttestationSignature(deviceId, timestampMs, secret);
  const headers = {
    "x-device-id": deviceId,
    "x-device-timestamp": String(timestampMs),
    "x-device-signature": signature,
  };
  if (idempotencyKey) {
    headers["x-idempotency-key"] = idempotencyKey;
  }
  return headers;
}

describe("deviceLifecycle routes", () => {
  beforeEach(() => {
    resetForTests();
  });

  it("creates a claim with valid attestation and idempotency key", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "true",
        DEVICE_ATTESTATION_SECRET: "epic2-secret",
        DEVICE_ATTESTATION_MAX_SKEW_SECONDS: "300",
      },
      async () => {
        const app = buildApp();
        const response = await request(app)
          .post("/api/device-lifecycle/claim")
          .set(attestationHeaders({ deviceId: "device-001", secret: "epic2-secret", idempotencyKey: "claim-1" }))
          .send({ tenantId: "tenant-1" });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe("created");
        expect(response.body.lifecycle.deviceId).toBe("device-001");
        expect(response.body.lifecycle.lifecycleState).toBe("CLAIMED");
      }
    ));

  it("returns replayed for same idempotency key and payload", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "true",
        DEVICE_ATTESTATION_SECRET: "epic2-secret",
      },
      async () => {
        const app = buildApp();
        const headers = attestationHeaders({
          deviceId: "device-001",
          secret: "epic2-secret",
          idempotencyKey: "claim-replay-1",
        });

        await request(app).post("/api/device-lifecycle/claim").set(headers).send({ tenantId: "tenant-1" });
        const replay = await request(app)
          .post("/api/device-lifecycle/claim")
          .set(headers)
          .send({ tenantId: "tenant-1" });

        expect(replay.status).toBe(200);
        expect(replay.body.status).toBe("replayed");
      }
    ));

  it("returns conflict when idempotency key is reused for different claim payload", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "true",
        DEVICE_ATTESTATION_SECRET: "epic2-secret",
      },
      async () => {
        const app = buildApp();
        const firstHeaders = attestationHeaders({
          deviceId: "device-001",
          secret: "epic2-secret",
          idempotencyKey: "claim-conflict-1",
        });
        const secondHeaders = attestationHeaders({
          deviceId: "device-999",
          secret: "epic2-secret",
          idempotencyKey: "claim-conflict-1",
        });

        await request(app).post("/api/device-lifecycle/claim").set(firstHeaders).send({ tenantId: "tenant-1" });
        const conflict = await request(app)
          .post("/api/device-lifecycle/claim")
          .set(secondHeaders)
          .send({ tenantId: "tenant-1" });

        expect(conflict.status).toBe(409);
        expect(conflict.body.status).toBe("conflict");
      }
    ));

  it("revokes device and returns updated lifecycle status", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "true",
        DEVICE_ATTESTATION_SECRET: "epic2-secret",
      },
      async () => {
        const app = buildApp();
        await request(app)
          .post("/api/device-lifecycle/claim")
          .set(attestationHeaders({ deviceId: "device-321", secret: "epic2-secret", idempotencyKey: "claim-321" }))
          .send({ tenantId: "tenant-1" });

        const revokeResponse = await request(app)
          .post("/api/device-lifecycle/revoke")
          .set(attestationHeaders({ deviceId: "device-321", secret: "epic2-secret" }))
          .send({ reason: "compromised" });

        expect(revokeResponse.status).toBe(200);
        expect(revokeResponse.body.lifecycle.lifecycleState).toBe("REVOKED");

        const statusResponse = await request(app).get("/api/device-lifecycle/status/device-321");
        expect(statusResponse.status).toBe(200);
        expect(statusResponse.body.lifecycle.lifecycleState).toBe("REVOKED");
      }
    ));

  it("rotates credentials with idempotency and exposes credential status", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "true",
        DEVICE_ATTESTATION_SECRET: "epic2-secret",
      },
      async () => {
        const app = buildApp();
        await request(app)
          .post("/api/device-lifecycle/claim")
          .set(attestationHeaders({ deviceId: "device-cred-1", secret: "epic2-secret", idempotencyKey: "claim-cred-1" }))
          .send({ tenantId: "tenant-1" });

        const rotateHeaders = attestationHeaders({
          deviceId: "device-cred-1",
          secret: "epic2-secret",
          idempotencyKey: "rotate-cred-1",
        });
        const rotate = await request(app)
          .post("/api/device-lifecycle/rotate-credentials")
          .set(rotateHeaders)
          .send({ reason: "scheduled" });

        expect(rotate.status).toBe(200);
        expect(rotate.body.status).toBe("rotated");
        expect(rotate.body.lifecycle.credentialVersion).toBe(2);
        expect(rotate.body.lifecycle.credentialStatus).toBe("ACTIVE");

        const rotateReplay = await request(app)
          .post("/api/device-lifecycle/rotate-credentials")
          .set(rotateHeaders)
          .send({ reason: "scheduled" });
        expect(rotateReplay.status).toBe(200);
        expect(rotateReplay.body.status).toBe("replayed");

        const credentials = await request(app).get("/api/device-lifecycle/credentials/device-cred-1");
        expect(credentials.status).toBe(200);
        expect(credentials.body.credentials.credentialVersion).toBe(2);
      }
    ));

  it("emergency revokes credentials", async () =>
    withEnv(
      {
        DEVICE_ATTESTATION_REQUIRED: "true",
        DEVICE_ATTESTATION_SECRET: "epic2-secret",
      },
      async () => {
        const app = buildApp();
        await request(app)
          .post("/api/device-lifecycle/claim")
          .set(attestationHeaders({ deviceId: "device-cred-2", secret: "epic2-secret", idempotencyKey: "claim-cred-2" }))
          .send({ tenantId: "tenant-1" });

        const revokeCredentials = await request(app)
          .post("/api/device-lifecycle/revoke-credentials")
          .set(attestationHeaders({ deviceId: "device-cred-2", secret: "epic2-secret" }))
          .send({ reason: "compromised-key" });

        expect(revokeCredentials.status).toBe(200);
        expect(revokeCredentials.body.lifecycle.credentialStatus).toBe("REVOKED");
      }
    ));
});
