/**
 * Native File Service for MHub
 *
 * Handles file downloads on Android using Capacitor Filesystem plugin.
 * Falls back to standard browser download on web.
 */
import { Capacitor } from "@capacitor/core";

let Filesystem = null;
let Directory = null;

const DEBUG = import.meta.env.DEV;
const log = (...args) => { if (DEBUG) console.log("[NativeFile]", ...args); };

/**
 * Dynamically import filesystem plugin
 */
async function loadPlugin() {
  if (Filesystem) return { Filesystem, Directory };
  if (!Capacitor.isNativePlatform()) return { Filesystem: null, Directory: null };

  try {
    const mod = await import("@capacitor/filesystem");
    Filesystem = mod.Filesystem;
    Directory = mod.Directory;
    return { Filesystem, Directory };
  } catch {
    return { Filesystem: null, Directory: null };
  }
}

/**
 * Download a blob as a file.
 * On Android, writes to the Documents directory.
 * On web, uses standard blob URL + anchor click.
 *
 * @param {Blob} blob - The file content
 * @param {string} filename - Desired filename
 * @param {string} [mimeType] - MIME type (inferred from blob if omitted)
 * @returns {Promise<{success: boolean, path?: string}>}
 */
export async function downloadBlob(blob, filename, mimeType) {
  const { Filesystem: fs, Directory: dir } = await loadPlugin();

  if (fs && dir) {
    try {
      // Convert blob to base64
      const base64 = await blobToBase64(blob);

      const result = await fs.writeFile({
        path: `Download/${filename}`,
        data: base64,
        directory: dir.Documents,
        recursive: true,
      });

      log("File saved to:", result.uri);
      return { success: true, path: result.uri };
    } catch (err) {
      log("Native file save failed, trying web fallback:", err);
    }
  }

  // Web fallback: standard blob download
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (err) {
    log("Web download failed:", err);
    return { success: false };
  }
}

/**
 * Download a URL to a local file (for image sharing, etc.).
 * @param {string} url - Remote URL to download
 * @param {string} filename - Local filename
 * @returns {Promise<string|null>} Local file path or null
 */
export async function downloadToTemp(url, filename) {
  const { Filesystem: fs, Directory: dir } = await loadPlugin();
  if (!fs || !dir) return null;

  try {
    // Fetch the file as blob
    const response = await fetch(url);
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);

    const result = await fs.writeFile({
      path: `tmp/${filename}`,
      data: base64,
      directory: dir.Cache,
      recursive: true,
    });

    return result.uri;
  } catch (err) {
    log("downloadToTemp failed:", err);
    return null;
  }
}

/**
 * Convert Blob to base64 string (without data: prefix).
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      // Strip the "data:...;base64," prefix
      const base64 = dataUrl.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
