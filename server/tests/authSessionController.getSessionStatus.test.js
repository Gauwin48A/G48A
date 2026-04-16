function createResponseMock() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("authSessionController.getSessionStatus", () => {
  it("returns anonymous session payload when user is not authenticated", async () => {
    jest.resetModules();
    // eslint-disable-next-line global-require
    const { getSessionStatus } = require("../src/controllers/authSessionController");

    const req = {
      cookies: {},
      authState: "anonymous",
      user: null,
    };
    const res = createResponseMock();
    await getSessionStatus(req, res);

    expect(res.json).toHaveBeenCalledWith({
      authenticated: false,
      authState: "anonymous",
      hasRefreshCookie: false,
      hasAccessCookie: false,
      canRefresh: false,
      requiresReauth: false,
      user: null,
    });
  });

  it("returns authenticated session payload with normalized user id", async () => {
    jest.resetModules();
    // eslint-disable-next-line global-require
    const { getSessionStatus } = require("../src/controllers/authSessionController");

    const req = {
      cookies: {
        refreshToken: "refresh-cookie",
        accessToken: "access-cookie",
      },
      authState: "authenticated",
      user: {
        user_id: "abc-123",
        role: "admin",
        email: "user@example.com",
        fullName: "Session User",
        tier: "Gold",
      },
    };
    const res = createResponseMock();
    await getSessionStatus(req, res);

    expect(res.json).toHaveBeenCalledWith({
      authenticated: true,
      authState: "authenticated",
      hasRefreshCookie: true,
      hasAccessCookie: true,
      canRefresh: true,
      requiresReauth: false,
      user: {
        id: "abc-123",
        role: "admin",
        email: "user@example.com",
        fullName: "Session User",
        phone: null,
        tier: "Gold",
      },
    });
  });

  it("marks revoked state as non-refreshable and reauth required", async () => {
    jest.resetModules();
    // eslint-disable-next-line global-require
    const { getSessionStatus } = require("../src/controllers/authSessionController");

    const req = {
      cookies: {
        refreshToken: "refresh-cookie",
      },
      authState: "revoked",
      user: null,
    };
    const res = createResponseMock();
    await getSessionStatus(req, res);

    expect(res.json).toHaveBeenCalledWith({
      authenticated: false,
      authState: "revoked",
      hasRefreshCookie: true,
      hasAccessCookie: false,
      canRefresh: false,
      requiresReauth: true,
      user: null,
    });
  });

  it("marks password_changed state as reauth required and blocks refresh", async () => {
    jest.resetModules();
    // eslint-disable-next-line global-require
    const { getSessionStatus } = require("../src/controllers/authSessionController");

    const req = {
      cookies: {
        refreshToken: "refresh-cookie",
      },
      authState: "password_changed",
      user: null,
    };
    const res = createResponseMock();
    await getSessionStatus(req, res);

    expect(res.json).toHaveBeenCalledWith({
      authenticated: false,
      authState: "password_changed",
      hasRefreshCookie: true,
      hasAccessCookie: false,
      canRefresh: false,
      requiresReauth: true,
      user: null,
    });
  });
});
