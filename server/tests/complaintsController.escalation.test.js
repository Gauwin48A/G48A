const buildRunQueryMock = () => async (query) => {
  const text = typeof query === "string" ? query : query.text;
  if (text.includes("to_regclass('public.complaints')")) {
    return { rows: [{ available: true }] };
  }
  if (
    text.includes("CREATE TABLE") ||
    text.includes("ALTER TABLE") ||
    text.includes("CREATE INDEX")
  ) {
    return { rows: [] };
  }
  if (text.includes("SELECT") && text.includes("total_recent")) {
    return { rows: [{ total_recent: 0, open_recent: 0 }] };
  }
  if (text.includes("similar_count")) {
    return { rows: [{ similar_count: 0 }] };
  }
  if (text.includes("INSERT INTO complaints")) {
    return {
      rows: [
        {
          complaint_id: "cmp-1",
          buyer_id: "buyer-1",
          seller_id: "seller-1",
          post_id: "post-1",
          complaint_type: "multiple complaints",
          description: "Test complaint",
          secret_code: null,
          status: "investigating",
          severity: "critical",
          evidence_metadata: {},
          sla_due_at: new Date().toISOString(),
          sla_breached_at: null,
          status_history: [],
          last_status_change_at: new Date().toISOString(),
          admin_response: null,
          resolved_by: null,
          resolved_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };
  }
  if (text.includes("INSERT INTO audit_logs")) {
    return { rows: [] };
  }
  return { rows: [] };
};

const createResponseMock = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

const loadController = ({ runQueryImpl, setUserRiskStateImpl, computeTrustScoreImpl }) => {
  jest.resetModules();

  const runQuery = jest.fn(runQueryImpl);
  const setUserRiskState = jest.fn(setUserRiskStateImpl);
  const computeTrustScore = jest.fn(computeTrustScoreImpl);

  jest.doMock("../src/utils/dbHelpers", () => ({
    runQuery,
    getAuthUserId: (req) => req?.user?.userId || req?.user?.id || req?.user?.user_id || null,
  }));
  jest.doMock("../src/services/trustScoreService", () => ({
    computeTrustScore,
  }));
  jest.doMock("../src/services/riskStateService", () => ({
    setUserRiskState,
  }));

  const controller = require("../src/controllers/complaintsController");
  return { controller, runQuery, setUserRiskState, computeTrustScore };
};

describe("complaintsController escalation", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("escalates critical complaints to frozen risk state", async () => {
    const { controller, setUserRiskState } = loadController({
      runQueryImpl: buildRunQueryMock(),
      computeTrustScoreImpl: async () => ({ score: 55 }),
      setUserRiskStateImpl: async () => ({
        status: "frozen",
        score: 9,
        reason: "complaint_freeze",
        expires_at: null,
      }),
    });

    const req = {
      user: { user_id: "buyer-1" },
      ip: "127.0.0.1",
      body: {
        seller_id: "seller-1",
        post_id: "post-1",
        complaint_type: "multiple complaints",
        description: "Test complaint",
        severity: "critical",
      },
    };
    const res = createResponseMock();

    await controller.createComplaint(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(setUserRiskState).toHaveBeenCalledWith(
      "seller-1",
      expect.objectContaining({ status: "frozen" })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        riskAction: expect.objectContaining({ status: "frozen" }),
      })
    );
  });

  it("keeps low severity complaints in limited review", async () => {
    const { controller, setUserRiskState } = loadController({
      runQueryImpl: buildRunQueryMock(),
      computeTrustScoreImpl: async () => ({ score: 60 }),
      setUserRiskStateImpl: async () => ({
        status: "limited",
        score: 2,
        reason: "complaint_under_review",
        expires_at: new Date().toISOString(),
      }),
    });

    const req = {
      user: { user_id: "buyer-1" },
      ip: "127.0.0.1",
      body: {
        seller_id: "seller-1",
        post_id: "post-1",
        complaint_type: "late reply",
        description: "Seller replied late",
        severity: "low",
      },
    };
    const res = createResponseMock();

    await controller.createComplaint(req, res);

    expect(setUserRiskState).toHaveBeenCalledWith(
      "seller-1",
      expect.objectContaining({ status: "limited" })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        riskAction: expect.objectContaining({ status: "limited" }),
      })
    );
  });
});
