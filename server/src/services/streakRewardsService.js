const { pool, DB_QUERY_TIMEOUT_MS, parseOptionalString } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const {
  applyRewardDeltaInTransaction,
  afterCommitRewardMutation,
} = require("./rewardsLedgerService");

const VISIT_DAILY_POINTS = 2;
const POST_DAILY_POINTS = 5;
const VISIT_STREAK_BONUSES = {
  3: 10,
  7: 25,
  14: 50,
  30: 100,
};
const POST_STREAK_BONUSES = {
  3: 20,
  7: 50,
  14: 100,
  30: 250,
};

let streakTableReadyPromise = null;

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(left, right) {
  return toDateKey(left) === toDateKey(right);
}

function isYesterday(lastDate, today) {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return toDateKey(lastDate) === toDateKey(yesterday);
}

async function ensureStreakTable(client) {
  if (streakTableReadyPromise) return streakTableReadyPromise;
  const queryRunner = client || pool;
  streakTableReadyPromise = queryRunner
    .query({
      text: `
        CREATE TABLE IF NOT EXISTS user_streaks (
          user_id TEXT PRIMARY KEY,
          visit_streak INTEGER NOT NULL DEFAULT 0,
          post_streak INTEGER NOT NULL DEFAULT 0,
          last_visit_date DATE,
          last_post_date DATE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `,
      values: [],
      query_timeout: DB_QUERY_TIMEOUT_MS,
    })
    .then(() => true)
    .catch((error) => {
      logger.warn("[StreakRewards] Unable to ensure user_streaks table", { message: error.message });
      return false;
    })
    .finally(() => {
      streakTableReadyPromise = null;
    });
  return streakTableReadyPromise;
}

async function updateStreakWithClient({
  client,
  userId,
  streakColumn,
  lastDateColumn,
  dailyPoints,
  bonusMap,
  actionPrefix,
}) {
  const normalizedUserId = parseOptionalString(userId);
  if (!normalizedUserId) return { updated: false, streak: 0, rewardChanges: [] };

  await ensureStreakTable(client);

  const today = new Date();
  const todayKey = toDateKey(today);

  const result = await client.query(
    {
      text: `
        SELECT ${streakColumn} AS streak_value,
               ${lastDateColumn} AS last_date
        FROM user_streaks
        WHERE user_id = $1
        FOR UPDATE
      `,
      values: [normalizedUserId],
      query_timeout: DB_QUERY_TIMEOUT_MS,
    },
  );

  let currentStreak = 0;
  let lastDate = null;
  let updated = false;

  if (result.rows.length > 0) {
    currentStreak = Number(result.rows[0]?.streak_value || 0);
    lastDate = result.rows[0]?.last_date ? new Date(result.rows[0]?.last_date) : null;
  }

  let nextStreak = currentStreak;
  if (!lastDate) {
    nextStreak = 1;
    updated = true;
  } else if (isSameDay(lastDate, today)) {
    updated = false;
  } else if (isYesterday(lastDate, today)) {
    nextStreak = Math.max(1, currentStreak + 1);
    updated = true;
  } else {
    nextStreak = 1;
    updated = true;
  }

  if (result.rows.length === 0) {
    await client.query(
      {
        text: `
          INSERT INTO user_streaks (user_id, ${streakColumn}, ${lastDateColumn}, updated_at)
          VALUES ($1, $2, $3, NOW())
        `,
        values: [normalizedUserId, nextStreak, todayKey],
        query_timeout: DB_QUERY_TIMEOUT_MS,
      },
    );
  } else if (updated) {
    await client.query(
      {
        text: `
          UPDATE user_streaks
          SET ${streakColumn} = $2,
              ${lastDateColumn} = $3,
              updated_at = NOW()
          WHERE user_id = $1
        `,
        values: [normalizedUserId, nextStreak, todayKey],
        query_timeout: DB_QUERY_TIMEOUT_MS,
      },
    );
  }

  const rewardChanges = [];

  if (updated && dailyPoints > 0) {
    const dailyChange = await applyRewardDeltaInTransaction({
      client,
      userId: normalizedUserId,
      pointsDelta: dailyPoints,
      action: `${actionPrefix}_daily`,
      description: `Daily ${actionPrefix} reward (${todayKey})`,
      idempotencyKey: `${actionPrefix}:daily:${normalizedUserId}:${todayKey}`,
    });
    if (dailyChange?.applied) rewardChanges.push(dailyChange);
  }

  if (updated && bonusMap[nextStreak]) {
    const bonusPoints = bonusMap[nextStreak];
    const milestoneChange = await applyRewardDeltaInTransaction({
      client,
      userId: normalizedUserId,
      pointsDelta: bonusPoints,
      action: `${actionPrefix}_streak_${nextStreak}`,
      description: `${actionPrefix} streak bonus for ${nextStreak} days`,
      idempotencyKey: `${actionPrefix}:streak:${normalizedUserId}:${nextStreak}`,
    });
    if (milestoneChange?.applied) rewardChanges.push(milestoneChange);
  }

  return { updated, streak: nextStreak, rewardChanges };
}

async function recordVisit(userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const outcome = await updateStreakWithClient({
      client,
      userId,
      streakColumn: "visit_streak",
      lastDateColumn: "last_visit_date",
      dailyPoints: VISIT_DAILY_POINTS,
      bonusMap: VISIT_STREAK_BONUSES,
      actionPrefix: "visit",
    });
    await client.query("COMMIT");
    outcome.rewardChanges.forEach((change) => {
      if (change?.applied) afterCommitRewardMutation(change);
    });
    return outcome;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    logger.warn("[StreakRewards] Failed to record visit", { message: error.message });
    return { updated: false, streak: 0, rewardChanges: [] };
  } finally {
    client.release();
  }
}

async function recordPost(userId, client = null) {
  if (!client) {
    const localClient = await pool.connect();
    try {
      await localClient.query("BEGIN");
      const outcome = await updateStreakWithClient({
        client: localClient,
        userId,
        streakColumn: "post_streak",
        lastDateColumn: "last_post_date",
        dailyPoints: POST_DAILY_POINTS,
        bonusMap: POST_STREAK_BONUSES,
        actionPrefix: "post",
      });
      await localClient.query("COMMIT");
      outcome.rewardChanges.forEach((change) => {
        if (change?.applied) afterCommitRewardMutation(change);
      });
      return outcome;
    } catch (error) {
      try {
        await localClient.query("ROLLBACK");
      } catch {}
      logger.warn("[StreakRewards] Failed to record post", { message: error.message });
      return { updated: false, streak: 0, rewardChanges: [] };
    } finally {
      localClient.release();
    }
  }

  return updateStreakWithClient({
    client,
    userId,
    streakColumn: "post_streak",
    lastDateColumn: "last_post_date",
    dailyPoints: POST_DAILY_POINTS,
    bonusMap: POST_STREAK_BONUSES,
    actionPrefix: "post",
  });
}

module.exports = {
  recordVisit,
  recordPost,
};
