const toHex = (buffer) =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const createRequestNonce = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      return toHex(crypto.getRandomValues(new Uint8Array(16)));
    }
  } catch { /* ignore */ }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

export const buildRequestSecurity = () => {
  const timestamp = Date.now();
  const nonce = createRequestNonce();
  return {
    timestamp,
    nonce,
    headers: {
      "X-MHub-Timestamp": String(timestamp),
      "X-MHub-Nonce": nonce,
    },
    body: {
      _timestamp: timestamp,
      _nonce: nonce,
    },
  };
};
