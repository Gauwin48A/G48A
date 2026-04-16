import { describe, expect, it } from "vitest";
import { mapAuthError } from "../../src/utils/authErrorMapper";

function makeError({ status = null, code = "", error = "", message = "" } = {}) {
  return {
    status,
    message,
    response: status
      ? {
          status,
          data: {
            code,
            error,
            message: error,
          },
        }
      : undefined,
  };
}

describe("mapAuthError", () => {
  it("maps otp challenge responses", () => {
    const error = makeError({
      status: 202,
      code: "RISK_CHALLENGE_REQUIRED",
      error: "OTP required",
    });
    error.response.data.requireOtp = true;
    error.response.data.challengeType = "otp";

    const mapped = mapAuthError(error);
    expect(mapped.requiresOtp).toBe(true);
    expect(mapped.category).toBe("challenge");
    expect(mapped.code).toBe("RISK_CHALLENGE_REQUIRED");
  });

  it("maps rate limit responses", () => {
    const mapped = mapAuthError(
      makeError({
        status: 429,
        error: "Too many requests",
      }),
    );
    expect(mapped.category).toBe("rate_limit");
    expect(mapped.retryable).toBe(true);
  });

  it("maps lock responses", () => {
    const mapped = mapAuthError(
      makeError({
        status: 423,
        error: "Account locked",
      }),
    );
    expect(mapped.category).toBe("locked");
    expect(mapped.message.toLowerCase()).toContain("temporarily locked");
  });

  it("maps unauthorized responses as credential failures", () => {
    const mapped = mapAuthError(
      makeError({
        status: 401,
        code: "AUTH_FAILED",
        error: "Invalid credentials",
      }),
    );
    expect(mapped.category).toBe("unauthorized");
    expect(mapped.requiresReauth).toBe(false);
  });

  it("maps network failures", () => {
    const mapped = mapAuthError({
      message: "Network Error",
    });
    expect(mapped.category).toBe("network");
    expect(mapped.retryable).toBe(true);
  });

  it("does not expose unsafe raw backend messages by default", () => {
    const mapped = mapAuthError(
      makeError({
        status: 500,
        error: "SQLSTATE stack trace token=abc",
      }),
      { defaultMessage: "Auth failed" },
    );
    expect(mapped.message.toLowerCase()).not.toContain("sqlstate");
    expect(mapped.message.toLowerCase()).not.toContain("token");
  });
});

