const DEFAULT_BALANCE = 120;
const DEFAULT_CLAIM_COINS = 20;

function resolveWalletKey(userId) {
  const safeId = String(userId || "").trim();
  return `mhub_coins_wallet_${safeId || "guest"}`;
}

function parseWallet(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function buildInitialWallet() {
  return {
    balance: DEFAULT_BALANCE,
    unlockedModules: {},
    transactions: [
      {
        type: "credit",
        amount: DEFAULT_BALANCE,
        reason: "Welcome bonus",
        createdAt: new Date().toISOString(),
      },
    ],
    lastClaimDate: null,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeWallet(parsed) {
  if (!parsed) {
    return buildInitialWallet();
  }

  const balance = Number(parsed.balance);
  const unlockedModules =
    parsed.unlockedModules && typeof parsed.unlockedModules === "object"
      ? parsed.unlockedModules
      : {};
  const transactions = Array.isArray(parsed.transactions)
    ? parsed.transactions
    : [];

  return {
    balance: Number.isFinite(balance) && balance >= 0 ? balance : 0,
    unlockedModules,
    transactions,
    lastClaimDate: parsed.lastClaimDate || null,
    updatedAt: parsed.updatedAt || new Date().toISOString(),
  };
}

function readWallet(userId) {
  if (typeof window === "undefined") {
    return buildInitialWallet();
  }

  const key = resolveWalletKey(userId);
  const parsed = parseWallet(window.localStorage.getItem(key));
  const wallet = normalizeWallet(parsed);

  // Persist normalized shape to avoid drift from previous versions.
  window.localStorage.setItem(key, JSON.stringify(wallet));
  return wallet;
}

function writeWallet(userId, wallet) {
  if (typeof window === "undefined") {
    return;
  }

  const key = resolveWalletKey(userId);
  window.localStorage.setItem(
    key,
    JSON.stringify({
      ...wallet,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function getCoinsWallet(userId) {
  return readWallet(userId);
}

export function getCoinsBalance(userId) {
  return readWallet(userId).balance;
}

export function hasEnoughCoins(userId, requiredCoins) {
  const safeRequired = Number(requiredCoins) || 0;
  return getCoinsBalance(userId) >= safeRequired;
}

export function isModuleUnlocked(userId, moduleId) {
  if (!moduleId) {
    return false;
  }
  return Boolean(readWallet(userId).unlockedModules[moduleId]);
}

export function claimDailyCoins(userId, amount = DEFAULT_CLAIM_COINS) {
  const safeAmount = Math.max(1, Number(amount) || DEFAULT_CLAIM_COINS);
  const wallet = readWallet(userId);
  const today = new Date().toISOString().slice(0, 10);

  if (wallet.lastClaimDate === today) {
    return {
      success: false,
      balance: wallet.balance,
      message: "Daily reward already claimed. Come back tomorrow.",
    };
  }

  const nextWallet = {
    ...wallet,
    balance: wallet.balance + safeAmount,
    lastClaimDate: today,
    transactions: [
      {
        type: "credit",
        amount: safeAmount,
        reason: "Daily reward",
        createdAt: new Date().toISOString(),
      },
      ...wallet.transactions,
    ].slice(0, 120),
  };

  writeWallet(userId, nextWallet);
  return {
    success: true,
    balance: nextWallet.balance,
    message: `+${safeAmount} coins added to your wallet.`,
  };
}

export function unlockPremiumModule(userId, moduleId, moduleCost) {
  const safeCost = Math.max(0, Number(moduleCost) || 0);
  const safeModuleId = String(moduleId || "").trim();
  const wallet = readWallet(userId);

  if (!safeModuleId) {
    return {
      success: false,
      balance: wallet.balance,
      message: "Invalid module.",
    };
  }

  if (wallet.unlockedModules[safeModuleId]) {
    return {
      success: true,
      balance: wallet.balance,
      alreadyUnlocked: true,
      message: "Module already unlocked.",
    };
  }

  if (wallet.balance < safeCost) {
    return {
      success: false,
      balance: wallet.balance,
      message: "Not enough coins in wallet.",
    };
  }

  const nextWallet = {
    ...wallet,
    balance: wallet.balance - safeCost,
    unlockedModules: {
      ...wallet.unlockedModules,
      [safeModuleId]: true,
    },
    transactions: [
      {
        type: "debit",
        amount: safeCost,
        reason: `Unlocked module: ${safeModuleId}`,
        createdAt: new Date().toISOString(),
      },
      ...wallet.transactions,
    ].slice(0, 120),
  };

  writeWallet(userId, nextWallet);
  return {
    success: true,
    balance: nextWallet.balance,
    message: "Module unlocked successfully.",
  };
}

export function getWalletTransactions(userId, maxItems = 12) {
  const safeMaxItems = Math.max(1, Number(maxItems) || 12);
  return readWallet(userId).transactions.slice(0, safeMaxItems);
}

