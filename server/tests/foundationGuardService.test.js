const {
  evaluateFoundationConfig,
  assertFoundationConfig,
} = require("../src/services/foundationGuardService");

describe("foundationGuardService", () => {
  it("passes when core foundation values are configured", () => {
    const report = evaluateFoundationConfig({
      isProduction: true,
      env: {
        NODE_ENV: "production",
        TRUST_PROXY: "1",
        CORS_ORIGINS: "https://app.example.com",
        API_SUPPORTED_VERSIONS: "1,2",
        TENANT_CONTEXT_REQUIRED_WRITE: "true",
        RUNTIME_BUDGET_READ_P95_MS: "220",
        RUNTIME_BUDGET_WRITE_P95_MS: "350",
        RUNTIME_BUDGET_EGRESS_KB: "128",
        JWT_SECRET: "a".repeat(40),
        REFRESH_SECRET: "b".repeat(40),
        PROMOTION_ENV: "production",
      },
    });

    expect(report.status).toBe("pass");
    expect(report.sections.edgeArchitecture.status).toBe("pass");
    expect(report.sections.runtimeBudgets.status).toBe("pass");
    expect(report.sections.secrets.status).toBe("pass");
  });

  it("fails when required secrets are missing", () => {
    const report = evaluateFoundationConfig({
      isProduction: true,
      env: {
        NODE_ENV: "production",
        TRUST_PROXY: "1",
        CORS_ORIGINS: "https://app.example.com",
        API_SUPPORTED_VERSIONS: "1",
        TENANT_CONTEXT_REQUIRED_WRITE: "true",
        JWT_SECRET: "",
        REFRESH_SECRET: "",
      },
    });

    expect(report.status).toBe("fail");
    expect(report.sections.secrets.checks.missing).toEqual(
      expect.arrayContaining(["JWT_SECRET", "REFRESH_SECRET"])
    );
  });

  it("warns in production when latency budgets exceed Epic 1 targets", () => {
    const report = evaluateFoundationConfig({
      isProduction: true,
      env: {
        NODE_ENV: "production",
        TRUST_PROXY: "1",
        CORS_ORIGINS: "https://app.example.com",
        API_SUPPORTED_VERSIONS: "1",
        TENANT_CONTEXT_REQUIRED_WRITE: "true",
        RUNTIME_BUDGET_READ_P95_MS: "500",
        RUNTIME_BUDGET_WRITE_P95_MS: "900",
        JWT_SECRET: "a".repeat(40),
        REFRESH_SECRET: "b".repeat(40),
      },
    });

    expect(report.status).toBe("warn");
    expect(report.sections.runtimeBudgets.status).toBe("warn");
    expect(report.sections.runtimeBudgets.checks.readWithinEpicTarget).toBe(false);
    expect(report.sections.runtimeBudgets.checks.writeWithinEpicTarget).toBe(false);
  });

  it("fails when runtime budget values are invalid", () => {
    const report = evaluateFoundationConfig({
      isProduction: false,
      env: {
        NODE_ENV: "development",
        API_SUPPORTED_VERSIONS: "1",
        RUNTIME_BUDGET_READ_P95_MS: "abc",
        RUNTIME_BUDGET_WRITE_P95_MS: "-12",
        RUNTIME_BUDGET_EGRESS_KB: "0",
        JWT_SECRET: "a".repeat(40),
        REFRESH_SECRET: "b".repeat(40),
      },
    });

    expect(report.status).toBe("fail");
    expect(report.sections.runtimeBudgets.status).toBe("fail");
    expect(report.sections.runtimeBudgets.checks.invalid).toEqual(
      expect.arrayContaining([
        "RUNTIME_BUDGET_READ_P95_MS",
        "RUNTIME_BUDGET_WRITE_P95_MS",
        "RUNTIME_BUDGET_EGRESS_KB",
      ])
    );
  });

  it("throws in strict mode for non-pass reports", () => {
    expect(() =>
      assertFoundationConfig({
        strict: true,
        env: {
          NODE_ENV: "production",
          JWT_SECRET: "short",
          REFRESH_SECRET: "short",
          API_SUPPORTED_VERSIONS: "1",
        },
      })
    ).toThrow(/Foundation config check failed/i);
  });
});
