/**
 * Native Share Service for MHub
 *
 * Uses @capacitor/share for proper native sharing (with images).
 * Falls back to Web Share API / clipboard on web.
 */
import { Capacitor } from "@capacitor/core";
import { downloadToTemp } from "./nativeFileService";

let Share = null;

const DEBUG = import.meta.env.DEV;
const log = (...args) => { if (DEBUG) console.log("[NativeShare]", ...args); };

/**
 * Dynamically import share plugin
 */
async function loadPlugin() {
  if (Share) return Share;
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const mod = await import("@capacitor/share");
    Share = mod.Share;
    return Share;
  } catch {
    return null;
  }
}

/**
 * Check if native share is available.
 */
export async function canNativeShare() {
  const plugin = await loadPlugin();
  if (!plugin) {
    return typeof navigator !== "undefined" && !!navigator.share;
  }
  try {
    const result = await plugin.canShare();
    return result.value;
  } catch {
    return false;
  }
}

/**
 * Share content natively.
 * @param {{ title?: string, text?: string, url?: string, dialogTitle?: string, files?: string[] }} options
 * @returns {Promise<{ activityType?: string } | null>}
 */
export async function shareContent({ title, text, url, dialogTitle, files } = {}) {
  const plugin = await loadPlugin();

  if (plugin) {
    try {
      const result = await plugin.share({
        title,
        text,
        url,
        dialogTitle: dialogTitle || "Share via",
        files,
      });
      log("Shared via:", result.activityType);
      return result;
    } catch (err) {
      if (err?.message?.includes("cancelled") || err?.message?.includes("dismissed")) {
        return null;
      }
      throw err;
    }
  }

  // Fallback to Web Share API
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { activityType: "web-share" };
    } catch (err) {
      if (err.name === "AbortError") return null;
      throw err;
    }
  }

  // Final fallback: copy to clipboard
  const shareText = url || text || title || "";
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(shareText);
    return { activityType: "clipboard" };
  }

  return null;
}

/**
 * Share a post from MHub marketplace.
 * @param {{ postId: string, title: string, price?: string, imageUrl?: string }} post
 */
export async function sharePost({ postId, title, price, imageUrl }) {
  const baseUrl = import.meta.env.VITE_APP_URL || "https://mhub.app";
  const postUrl = `${baseUrl}/post/${postId}`;
  const text = price
    ? `Check out "${title}" for ${price} on MHub!`
    : `Check out "${title}" on MHub!`;

  const shareOptions = {
    title: `MHub: ${title}`,
    text,
    url: postUrl,
    dialogTitle: "Share this listing",
  };

  // If we have an image URL and native share, download to temp and include the file
  if (imageUrl && Capacitor.isNativePlatform()) {
    try {
      const ext = imageUrl.split(".").pop()?.split("?")[0] || "jpg";
      const localPath = await downloadToTemp(imageUrl, `share-${postId}.${ext}`);
      if (localPath) {
        shareOptions.files = [localPath];
      }
    } catch {
      // Fallback: share without image
    }
  }

  return shareContent(shareOptions);
}

/**
 * Share a feed post.
 * @param {{ feedId: string, content: string }} feed
 */
export async function shareFeedPost({ feedId, content }) {
  const baseUrl = import.meta.env.VITE_APP_URL || "https://mhub.app";
  const feedUrl = `${baseUrl}/feed/${feedId}`;
  const text = content.length > 100 ? content.substring(0, 100) + "..." : content;

  return shareContent({
    title: "MHub Community Post",
    text,
    url: feedUrl,
    dialogTitle: "Share this post",
  });
}

/**
 * Share referral/invite link.
 * @param {{ code: string, message?: string }} invite
 */
export async function shareInvite({ code, message }) {
  const baseUrl = import.meta.env.VITE_APP_URL || "https://mhub.app";
  const inviteUrl = `${baseUrl}/invite/${code}`;
  const text = message || `Join MHub marketplace! Use my invite link:`;

  return shareContent({
    title: "Join MHub",
    text: `${text} ${inviteUrl}`,
    url: inviteUrl,
    dialogTitle: "Invite a friend",
  });
}
