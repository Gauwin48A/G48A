const express = require("express");
const request = require("supertest");
const automationRoutes = require("../src/routes/automation");
const { resetForTests } = require("../src/services/automationEngineService");

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
  app.use("/api/automation", automationRoutes);
  return app;
}

describe("automation routes", () => {
  beforeEach(() => {
    resetForTests();
  });

  it("registers and activates a rule with admin token", async () =>
    withEnv(
      {
        AUTOMATION_RULES_ADMIN_TOKEN: "automation-admin",
      },
      async () => {
        const app = buildApp();
        const unauthorized = await request(app).post("/api/automation/rules/register").send({
          rule: {
            name: "High temp",
            version: "1",
            condition: { field: "temperature", op: ">", value: 70 },
            action: { type: "raise_alert", severity: "P1", message: "High temperature" },
          },
        });
        expect(unauthorized.status).toBe(401);

        const register = await request(app)
          .post("/api/automation/rules/register")
          .set("x-automation-admin-token", "automation-admin")
          .send({
            rule: {
              ruleId: "rule-temp-1",
              name: "High temp",
              version: "1",
              condition: { field: "temperature", op: ">", value: 70 },
              action: { type: "raise_alert", severity: "P1", message: "High temperature" },
              priority: 5,
            },
          });
        expect(register.status).toBe(201);
        expect(register.body.status).toBe("registered");

        const activate = await request(app)
          .post("/api/automation/rules/activate")
          .set("x-automation-admin-token", "automation-admin")
          .send({ ruleId: "rule-temp-1" });
        expect(activate.status).toBe(200);
        expect(activate.body.status).toBe("activated");
      }
    ));

  it("evaluates event, updates twin, and dedupes alerts", async () =>
    withEnv(
      {
        AUTOMATION_RULES_ADMIN_TOKEN: "automation-admin",
        AUTOMATION_ALERT_DEDUPE_SECONDS: "300",
      },
      async () => {
        const app = buildApp();
        await request(app)
          .post("/api/automation/rules/register")
          .set("x-automation-admin-token", "automation-admin")
          .send({
            rule: {
              ruleId: "rule-temp-2",
              name: "High temp with twin",
              version: "1",
              condition: { field: "temperature", op: ">", value: 70 },
              action: { type: "raise_alert", severity: "P1", message: "Overheat" },
            },
          });
        await request(app)
          .post("/api/automation/rules/activate")
          .set("x-automation-admin-token", "automation-admin")
          .send({ ruleId: "rule-temp-2" });

        const first = await request(app)
          .post("/api/automation/events/evaluate")
          .set("x-automation-admin-token", "automation-admin")
          .send({
            event: {
              eventId: "auto-event-1",
              deviceId: "device-a1",
              tenantId: "tenant-1",
              eventType: "temperature.reading",
              occurredAt: new Date().toISOString(),
              payload: { temperature: 91, unit: "c" },
            },
          });
        expect(first.status).toBe(200);
        expect(first.body.executedRules.length).toBe(1);
        expect(first.body.executedRules[0].action.status).toBe("created");

        const second = await request(app)
          .post("/api/automation/events/evaluate")
          .set("x-automation-admin-token", "automation-admin")
          .send({
            event: {
              eventId: "auto-event-2",
              deviceId: "device-a1",
              tenantId: "tenant-1",
              eventType: "temperature.reading",
              occurredAt: new Date(Date.now() + 1000).toISOString(),
              payload: { temperature: 92, unit: "c" },
            },
          });
        expect(second.status).toBe(200);
        expect(second.body.executedRules[0].action.status).toBe("deduped");

        const alerts = await request(app).get("/api/automation/alerts");
        expect(alerts.status).toBe(200);
        expect(alerts.body.alerts.length).toBe(1);

        const twin = await request(app).get("/api/automation/twins/device-a1");
        expect(twin.status).toBe(200);
        expect(twin.body.twin.state.lastEventType).toBe("temperature.reading");
      }
    ));

  it("simulates a rule and acknowledges alert", async () =>
    withEnv(
      {
        AUTOMATION_RULES_ADMIN_TOKEN: "automation-admin",
      },
      async () => {
        const app = buildApp();
        await request(app)
          .post("/api/automation/rules/register")
          .set("x-automation-admin-token", "automation-admin")
          .send({
            rule: {
              ruleId: "rule-temp-3",
              name: "Sim rule",
              version: "1",
              condition: { field: "temperature", op: ">", value: 80 },
              action: { type: "raise_alert", severity: "P2", message: "Temp warning" },
            },
          });
        await request(app)
          .post("/api/automation/rules/activate")
          .set("x-automation-admin-token", "automation-admin")
          .send({ ruleId: "rule-temp-3" });

        const simulation = await request(app)
          .post("/api/automation/rules/simulate")
          .set("x-automation-admin-token", "automation-admin")
          .send({
            rule: {
              name: "Sim rule candidate",
              version: "2",
              condition: { field: "temperature", op: ">", value: 80 },
              action: { type: "raise_alert", severity: "P2", message: "Temp warning" },
            },
            sampleEvents: [
              { deviceId: "device-a2", eventType: "temperature.reading", occurredAt: new Date().toISOString(), payload: { temperature: 70 } },
              { deviceId: "device-a2", eventType: "temperature.reading", occurredAt: new Date().toISOString(), payload: { temperature: 90 } },
            ],
          });
        expect(simulation.status).toBe(200);
        expect(simulation.body.result.matchedCount).toBe(1);

        const evaluate = await request(app)
          .post("/api/automation/events/evaluate")
          .set("x-automation-admin-token", "automation-admin")
          .send({
            event: {
              eventId: "auto-event-3",
              deviceId: "device-a2",
              eventType: "temperature.reading",
              occurredAt: new Date().toISOString(),
              payload: { temperature: 91 },
            },
          });
        const alertId = evaluate.body.executedRules[0].action.alertId;
        const ack = await request(app)
          .post(`/api/automation/alerts/${alertId}/ack`)
          .set("x-automation-admin-token", "automation-admin")
          .send({ actorId: "operator-1" });
        expect(ack.status).toBe(200);
        expect(ack.body.status).toBe("acknowledged");
      }
    ));
});
