const logger = require("../utils/logger");
const { DB_QUERY_TIMEOUT_MS, parseOptionalString, parsePositiveInt } = require("../utils/dbHelpers");
const { applyRewardDeltaInTransaction } = require("./rewardsLedgerService");

const DEFAULT_CHAIN_POINTS = [2, 1, 0.5];
const DEFAULT_MAX_CHAIN_DEPTH = 3;

function parseChainPointsFromEnv() {
  const raw = parseOptionalString(process.env.REFERRAL_CHAIN_POINTS);
  if (!raw) return DEFAULT_CHAIN_POINTS.slice();

  const parsed = raw
    .split(",")
    .map((entry) => Number.parseFloat(entry.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  return parsed.length ? parsed : DEFAULT_CHAIN_POINTS.slice();
}

const CHAIN_POINTS = parseChainPointsFromEnv();
const CHAIN_MAX_DEPTH = parsePositiveInt(
  process.env.REFERRAL_CHAIN_MAX_DEPTH,
  Math.min(DEFAULT_MAX_CHAIN_DEPTH, CHAIN_POINTS.length),
);

let referralClosureAvailablePromise = null;

async function hasReferralClosure(client) {
  if (!referralClosureAvailablePromise) {
    referralClosureAvailablePromise = runClientQuery(
      client,
      "SELECT to_regclass('public.referral_closure') AS table_name",
    )
      .then((result) => Boolean(result.rows?.[0]?.table_name))
      .catch(() => false);
  }
  return referralClosureAvailablePromise;
}

function getChainRewardForDepth(depth) {
  const normalizedDepth = Number.parseInt(depth, 10);
  if (!Number.isFinite(normalizedDepth) || normalizedDepth < 1) return 0;
  return CHAIN_POINTS[normalizedDepth - 1] || 0;
}

function getChainRewardRules() {
  return CHAIN_POINTS.map((points, index) => ({
    level: index + 1,
    points,
  }));
}

async function runClientQuery(client, text, values = []) {
  return client.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS,
  });
}

async function getReferralChain(client, subjectUserId, maxDepth = CHAIN_MAX_DEPTH) {
  const normalizedSubjectId = parseOptionalString(subjectUserId);
  if (!normalizedSubjectId) return [];

  try {
    const useClosure = await hasReferralClosure(client);
    if (useClosure) {
      const closureResult = await runClientQuery(
        client,
        `
          SELECT ancestor_user_id, depth
          FROM referral_closure
          WHERE descendant_user_id::text = $1
            AND depth <= $2
          ORDER BY depth ASC
        `,
        [normalizedSubjectId, maxDepth],
      );
      return Array.isArray(closureResult.rows) ? closureResult.rows : [];
    }

    const result = await runClientQuery(
      client,
      `
        WITH RECURSIVE chain AS (
          SELECT
            u.referred_by::text AS ancestor_user_id,
            1 AS depth,
            ARRAY[u.user_id::text] AS path
          FROM users u
          WHERE u.user_id::text = $1
            AND u.referred_by IS NOT NULL

          UNION ALL

          SELECT
            parent.referred_by::text AS ancestor_user_id,
            chain.depth + 1 AS depth,
            chain.path || parent.user_id::text
          FROM users parent
          INNER JOIN chain
            ON parent.user_id::text = chain.ancestor_user_id
          WHERE parent.referred_by IS NOT NULL
            AND chain.depth < $2
            AND NOT parent.referred_by::text = ANY(chain.path)
        )
        SELECT ancestor_user_id, depth
        FROM chain
        WHERE ancestor_user_id IS NOT NULL
        ORDER BY depth ASC
      `,
      [normalizedSubjectId, maxDepth],
    );

    return Array.isArray(result.rows) ? result.rows : [];
  } catch (error) {
    logger.warn("[ReferralChainRewards] Failed to resolve referral chain", {
      message: error.message,
    });
    return [];
  }
}

async function applyReferralChainRewards({
  client,
  subjectUserId,
  referenceId,
  eventKey,
  maxDepth = CHAIN_MAX_DEPTH,
}) {
  const normalizedSubjectId = parseOptionalString(subjectUserId);
  if (!normalizedSubjectId) return [];

  const chain = await getReferralChain(client, normalizedSubjectId, maxDepth);
  if (!chain.length) return [];

  const appliedChanges = [];
  const seenAncestors = new Set();

  for (const node of chain) {
    const ancestorId = parseOptionalString(node.ancestor_user_id);
    if (!ancestorId || ancestorId === normalizedSubjectId) continue;
    if (seenAncestors.has(ancestorId)) continue;
    seenAncestors.add(ancestorId);

    const depth = Number.parseInt(node.depth, 10);
    const points = getChainRewardForDepth(depth);
    if (!points) continue;

    const idempotencyKey = `chain:${eventKey}:${referenceId}:${normalizedSubjectId}:L${depth}`;
    const action = `referral_chain_${eventKey}_l${depth}`;
    const description = `Level ${depth} chain reward for ${eventKey} by ${normalizedSubjectId}`;

    const change = await applyRewardDeltaInTransaction({
      client,
      userId: ancestorId,
      pointsDelta: points,
      action,
      description,
      idempotencyKey,
    });

    if (change?.applied) {
      appliedChanges.push(change);
    }
  }

  return appliedChanges;
}

module.exports = {
  CHAIN_MAX_DEPTH,
  getChainRewardForDepth,
  getChainRewardRules,
  getReferralChain,
  applyReferralChainRewards,
};
