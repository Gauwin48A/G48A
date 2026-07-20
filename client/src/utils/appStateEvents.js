const SUBSCRIPTION_UPDATED_EVENT = "mhub:subscription-updated";
const COIN_BALANCE_UPDATED_EVENT = "mhub:coin-balance-updated";
const COINS_UPDATED_EVENT = "mhub:coins-updated";
const PROFILE_UPDATED_EVENT = "mhub:profile-updated";

function canUseWindow() {
  return typeof window !== "undefined";
}

function emitEvent(eventName, detail = {}) {
  if (!canUseWindow()) {
    return false;
  }

  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    return true;
  } catch {
    return false;
  }
}

function subscribeToEvent(eventName, listener) {
  if (!canUseWindow() || typeof listener !== "function") {
    return () => {};
  }

  const handler = (event) => {
    listener(event?.detail || {});
  };

  window.addEventListener(eventName, handler);
  return () => {
    window.removeEventListener(eventName, handler);
  };
}

export function emitSubscriptionUpdated(detail = {}) {
  return emitEvent(SUBSCRIPTION_UPDATED_EVENT, {
    occurredAt: Date.now(),
    ...detail,
  });
}

export function subscribeSubscriptionUpdated(listener) {
  return subscribeToEvent(SUBSCRIPTION_UPDATED_EVENT, listener);
}

export function emitCoinBalanceUpdated(balance, detail = {}) {
  emitEvent(COINS_UPDATED_EVENT, { occurredAt: Date.now(), balance, coins: balance, ...detail });
  return emitEvent(COIN_BALANCE_UPDATED_EVENT, {
    occurredAt: Date.now(),
    balance,
    coins: balance,
    ...detail,
  });
}

export function subscribeCoinBalanceUpdated(listener) {
  return subscribeToEvent(COIN_BALANCE_UPDATED_EVENT, listener);
}

export function emitProfileUpdated(profileData, detail = {}) {
  return emitEvent(PROFILE_UPDATED_EVENT, {
    occurredAt: Date.now(),
    profile: profileData,
    ...detail,
  });
}

export {
  SUBSCRIPTION_UPDATED_EVENT,
  COIN_BALANCE_UPDATED_EVENT,
  COINS_UPDATED_EVENT,
  PROFILE_UPDATED_EVENT,
};
