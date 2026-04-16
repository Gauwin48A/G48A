const express = require("express");
const request = require("supertest");
const cookieParser = require("cookie-parser");

function createApp({
  verifyTokenImpl = () => ({ id: "user-1", role: "user" }),
  revoked = false,
  passwordChanged = false,
} = {}) {
  jest.resetModules();

  jest.doMock("../src/services/tokenVerificationCache", () => ({
    verifyToken: jest.fn((token, secret) => verifyTokenImpl(token, secret)),
  }));

  jest.doMock("../src/services/accessTokenPolicyService", () => ({
    isAccessTokenRevoked: jest.fn(async () => revoked),
    isAccessTokenInvalidByPasswordChange: jest.fn(async () => passwordChanged),
  }));

  // eslint-disable-next-line global-require
  const { optionalAuthenticateToken } = require("../src/middleware/security");

  const app = express();
  app.use(cookieParser());
  app.get("/session-check", optionalAuthenticateToken, (req, res) => {
    return res.status(200).json({
      authState: req.authState,
      hasUser: Boolean(req.user),
      userId: req.user?.id ?? null,
    });
  });

  return app;
}

describe("optionalAuthenticateToken", () => {
  afterEach(() => {
    jest.dontMock("../src/services/tokenVerificationCache");
    jest.dontMock("../src/services/accessTokenPolicyService");
  });

  it("sets anonymous state when token is missing", async () => {
    const app = createApp();

    const response = await request(app).get("/session-check");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      authState: "anonymous",
      hasUser: false,
      userId: null,
    });
  });

  it("sets invalid_token state when provided token is invalid", async () => {
    const app = createApp({
      verifyTokenImpl: () => {
        throw new Error("invalid token");
      },
    });

    const response = await request(app)
      .get("/session-check")
      .set("Authorization", "Bearer invalid-token");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      authState: "invalid_token",
      hasUser: false,
      userId: null,
    });
  });

  it("sets authenticated state and user payload when token is valid", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/session-check")
      .set("Authorization", "Bearer valid-token");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      authState: "authenticated",
      hasUser: true,
      userId: "user-1",
    });
  });

  it("marks revoked token state when policy blocks token", async () => {
    const app = createApp({ revoked: true });

    const response = await request(app)
      .get("/session-check")
      .set("Authorization", "Bearer valid-token");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      authState: "revoked",
      hasUser: false,
      userId: null,
    });
  });
});

