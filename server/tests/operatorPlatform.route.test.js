const express = require("express");
const request = require("supertest");
const operatorRoutes = require("../src/routes/operatorPlatform");
const { resetForTests } = require("../src/services/operatorPlatformService");

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
  app.use("/api/operator-platform", operatorRoutes);
  return app;
}

describe("operator platform routes", () => {
  beforeEach(() => {
    resetForTests();
  });

  it("enforces admin token for console and playbook definitions", async () =>
    withEnv(
      {
        OPERATOR_PLATFORM_ADMIN_TOKEN: "ops-admin",
      },
      async () => {
        const app = buildApp();
        const unauthorized = await request(app).post("/api/operator-platform/console/task-flows").send({
          name: "Acknowledge P1 alert",
          clickCount: 3,
        });
        expect(unauthorized.status).toBe(401);

        const taskFlow = await request(app)
          .post("/api/operator-platform/console/task-flows")
          .set("x-operator-admin-token", "ops-admin")
          .send({
            flowId: "flow-p1",
            name: "Acknowledge P1 alert",
            clickCount: 3,
          });
        expect(taskFlow.status).toBe(201);
        expect(taskFlow.body.flow.compliant).toBe(true);

        const playbook = await request(app)
          .post("/api/operator-platform/playbooks/upsert")
          .set("x-operator-admin-token", "ops-admin")
          .send({
            playbookId: "pb-1",
            name: "Restart edge service",
            steps: ["Drain traffic", "Restart service", "Validate health"],
          });
        expect(playbook.status).toBe(201);
        expect(playbook.body.playbook.stepCount).toBe(3);
      }
    ));

  it("runs playbooks and exposes playbook catalog", async () =>
    withEnv(
      {
        OPERATOR_PLATFORM_ADMIN_TOKEN: "ops-admin",
      },
      async () => {
        const app = buildApp();
        await request(app)
          .post("/api/operator-platform/playbooks/upsert")
          .set("x-operator-admin-token", "ops-admin")
          .send({
            playbookId: "pb-2",
            name: "Restart gateway",
            steps: ["Scale up standby", "Rotate traffic", "Run smoke checks"],
          });

        const run = await request(app)
          .post("/api/operator-platform/playbooks/pb-2/run")
          .set("x-operator-admin-token", "ops-admin")
          .send({ actorId: "oncall-1", context: { region: "ap-south" } });
        expect(run.status).toBe(200);
        expect(run.body.status).toBe("executed");
        expect(run.body.execution.status).toBe("completed");

        const list = await request(app)
          .get("/api/operator-platform/playbooks")
          .set("x-operator-admin-token", "ops-admin");
        expect(list.status).toBe(200);
        expect(list.body.playbooks.length).toBe(1);
      }
    ));

  it("registers developer app and accessibility audit, then returns summary", async () =>
    withEnv(
      {
        OPERATOR_PLATFORM_ADMIN_TOKEN: "ops-admin",
      },
      async () => {
        const app = buildApp();

        const devApp = await request(app)
          .post("/api/operator-platform/developer/apps/register")
          .set("x-operator-admin-token", "ops-admin")
          .send({
            appName: "Partner Fleet Dashboard",
            ownerId: "partner-1",
            scopes: ["telemetry:read", "alerts:read"],
          });
        expect(devApp.status).toBe(201);
        expect(devApp.body.status).toBe("registered");

        const accessibility = await request(app)
          .post("/api/operator-platform/ux/accessibility/audits")
          .set("x-operator-admin-token", "ops-admin")
          .send({
            journeyId: "incident-triage",
            locale: "en-IN",
            wcagAaPass: true,
            mobileReady: true,
          });
        expect(accessibility.status).toBe(201);
        expect(accessibility.body.audit.pass).toBe(true);

        const summary = await request(app)
          .get("/api/operator-platform/summary")
          .set("x-operator-admin-token", "ops-admin");
        expect(summary.status).toBe(200);
        expect(summary.body.summary.developerApps).toBe(1);
      }
    ));
});
