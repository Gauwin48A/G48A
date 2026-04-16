const createResponseMock = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    clearCookie: jest.fn(),
    headersSent: false,
  };
  res.status.mockReturnValue(res);
  return res;
};

const loadMiddleware = ({
  checkDeviceBindingImpl,
  checkAccountSwitchingImpl,
  verifyLoginOtpImpl,
  evaluateLoginRiskImpl,
}) => {
  jest.resetModules();

  const checkDeviceBinding = jest.fn(checkDeviceBindingImpl);
  const checkAccountSwitching = jest.fn(checkAccountSwitchingImpl);
  const verifyLoginOtp = jest.fn(verifyLoginOtpImpl);
  const evaluateLoginRisk = jest.fn(evaluateLoginRiskImpl);
  const logAuthActivity = jest.fn();
  const bindPhoneToDevice = jest.fn();
  const extractDeviceFingerprint = jest.fn(() => "device-001");

  jest.doMock("../src/middleware/deviceBinding", () => ({
    checkDeviceBinding,
    checkAccountSwitching,
    logAuthActivity,
    bindPhoneToDevice,
    verifyLoginOtp,
    extractDeviceFingerprint,
  }));
  jest.doMock("../src/services/riskStateService", () => ({
    evaluateLoginRisk,
    setUserRiskState: jest.fn(),
  }));
  jest.doMock("../src/utils/dbHelpers", () => ({
    runQuery: jest.fn(async () => ({ rows: [] })),
  }));

  const { deviceBindingPostLogin } = require("../src/middleware/deviceBindingPostAuth");
  return {
    deviceBindingPostLogin,
    mocks: {
      checkDeviceBinding,
      checkAccountSwitching,
      verifyLoginOtp,
      evaluateLoginRisk,
      bindPhoneToDevice,
    },
  };
};

describe("deviceBindingPostAuth step-up", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns step-up requirement when OTP is missing", async () => {
    const { deviceBindingPostLogin, mocks } = loadMiddleware({
      checkDeviceBindingImpl: async () => ({ allowed: true, isNew: true }),
      checkAccountSwitchingImpl: async () => ({ allowed: true }),
      verifyLoginOtpImpl: async () => ({ valid: true }),
      evaluateLoginRiskImpl: async () => ({ stepUpRequired: true, status: "limited" }),
    });

    const req = {
      authResult: { success: true, user: { id: "user-1" } },
      body: {},
      headers: {},
      ip: "127.0.0.1",
    };
    const res = createResponseMock();

    await deviceBindingPostLogin(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        requireOtp: true,
        code: "STEP_UP_REQUIRED",
      })
    );
    expect(mocks.verifyLoginOtp).not.toHaveBeenCalled();
  });

  it("returns OTP invalid when step-up OTP fails", async () => {
    const { deviceBindingPostLogin, mocks } = loadMiddleware({
      checkDeviceBindingImpl: async () => ({ allowed: true, isNew: true }),
      checkAccountSwitchingImpl: async () => ({ allowed: true }),
      verifyLoginOtpImpl: async () => ({ valid: false, attemptsRemaining: 2 }),
      evaluateLoginRiskImpl: async () => ({ stepUpRequired: true, status: "limited" }),
    });

    const req = {
      authResult: { success: true, user: { id: "user-1" } },
      body: { otp: "1234", phone: "9999999999" },
      headers: {},
      ip: "127.0.0.1",
    };
    const res = createResponseMock();

    await deviceBindingPostLogin(req, res, () => {});

    expect(mocks.verifyLoginOtp).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        requireOtp: true,
        code: "OTP_INVALID",
      })
    );
  });
});
