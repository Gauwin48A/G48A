import io from "socket.io-client";
import { getSocketUrl } from "@/lib/networkConfig";

/**
 * Strip trailing slashes from a URL string.
 * @param {string} value
 * @returns {string}
 */
function normalizeUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

const SOCKET_URL = normalizeUrl(getSocketUrl());

const SOCKET_RECONNECT_ATTEMPTS = Number.parseInt(
  import.meta.env.VITE_SOCKET_RECONNECT_ATTEMPTS || "8",
  10
);

const SOCKET_CONNECT_TIMEOUT_MS = Number.parseInt(
  import.meta.env.VITE_SOCKET_CONNECT_TIMEOUT_MS || "8000",
  10
);

/**
 * Pre-configured Socket.IO client instance connected to the backend.
 * Supports websocket and polling transports with automatic reconnection.
 */
export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
  path: "/socket.io",
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts:
    Number.isFinite(SOCKET_RECONNECT_ATTEMPTS) && SOCKET_RECONNECT_ATTEMPTS > 0
      ? SOCKET_RECONNECT_ATTEMPTS
      : 8,
  reconnectionDelay: 1e3,
  reconnectionDelayMax: 8e3,
  timeout:
    Number.isFinite(SOCKET_CONNECT_TIMEOUT_MS) && SOCKET_CONNECT_TIMEOUT_MS > 0
      ? SOCKET_CONNECT_TIMEOUT_MS
      : 8e3,
});

const readStoredToken = () => {
  try {
    return localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  } catch {
    return "";
  }
};

let lastAuthToken = "";

export const connectSocketWithToken = (tokenOverride) => {
  const token = String(tokenOverride || readStoredToken() || "").trim();
  if (!token) return socket;
  socket.auth = { token };
  if (socket.connected) {
    if (token !== lastAuthToken) {
      socket.disconnect();
      socket.connect();
    }
  } else {
    socket.connect();
  }
  lastAuthToken = token;
  return socket;
};

export const disconnectSocket = () => {
  lastAuthToken = "";
  if (socket.connected || socket.active) {
    socket.disconnect();
  }
};

if (import.meta.env.DEV) {
  socket.on("connect_error", (error) => {
    const endpoint = `${SOCKET_URL}/socket.io`;
    console.warn(
      `[socket] connect_error (${endpoint}):`,
      error?.message || error
    );
  });
}
