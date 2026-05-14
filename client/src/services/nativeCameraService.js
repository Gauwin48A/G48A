/**
 * Native Camera Service for MHub
 *
 * Uses @capacitor/camera for native photo capture and gallery access.
 * Falls back gracefully to file input on web.
 */
import { Capacitor } from "@capacitor/core";

let Camera = null;
let CameraResultType = null;
let CameraSource = null;

const DEBUG = import.meta.env.DEV;
const log = (...args) => { if (DEBUG) console.log("[NativeCamera]", ...args); };

/**
 * Dynamically import camera plugin
 */
async function loadPlugin() {
  if (Camera) return { Camera, CameraResultType, CameraSource };
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const mod = await import("@capacitor/camera");
    Camera = mod.Camera;
    CameraResultType = mod.CameraResultType;
    CameraSource = mod.CameraSource;
    return { Camera, CameraResultType, CameraSource };
  } catch (err) {
    log("Failed to load camera plugin:", err);
    return null;
  }
}

/**
 * Check if native camera is available
 */
export function isNativeCameraAvailable() {
  return Capacitor.isNativePlatform();
}

/**
 * Take a photo using the device camera.
 * @param {{ quality?: number, width?: number, height?: number }} options
 * @returns {Promise<{ dataUrl: string, format: string } | null>}
 */
export async function takePhoto({ quality = 80, width = 1200, height = 1200 } = {}) {
  const plugins = await loadPlugin();
  if (!plugins) return null;

  const { Camera: cam, CameraResultType: resultType, CameraSource: source } = plugins;

  try {
    const photo = await cam.getPhoto({
      quality,
      width,
      height,
      allowEditing: false,
      resultType: resultType.DataUrl,
      source: source.Camera,
      saveToGallery: false,
      correctOrientation: true,
    });

    log("Photo captured, format:", photo.format);
    return {
      dataUrl: photo.dataUrl,
      format: photo.format,
      webPath: photo.webPath || null,
    };
  } catch (err) {
    if (err?.message?.includes("cancelled") || err?.message?.includes("User cancelled")) {
      log("User cancelled camera");
      return null;
    }
    log("Camera error:", err);
    throw err;
  }
}

/**
 * Pick a photo from the device gallery.
 * @param {{ quality?: number, width?: number, height?: number }} options
 * @returns {Promise<{ dataUrl: string, format: string } | null>}
 */
export async function pickFromGallery({ quality = 80, width = 1200, height = 1200 } = {}) {
  const plugins = await loadPlugin();
  if (!plugins) return null;

  const { Camera: cam, CameraResultType: resultType, CameraSource: source } = plugins;

  try {
    const photo = await cam.getPhoto({
      quality,
      width,
      height,
      allowEditing: false,
      resultType: resultType.DataUrl,
      source: source.Photos,
      correctOrientation: true,
    });

    log("Photo picked, format:", photo.format);
    return {
      dataUrl: photo.dataUrl,
      format: photo.format,
      webPath: photo.webPath || null,
    };
  } catch (err) {
    if (err?.message?.includes("cancelled") || err?.message?.includes("User cancelled")) {
      log("User cancelled gallery");
      return null;
    }
    log("Gallery error:", err);
    throw err;
  }
}

/**
 * Pick multiple photos from gallery.
 * @param {{ quality?: number, width?: number, height?: number, limit?: number }} options
 * @returns {Promise<Array<{ dataUrl: string, format: string }>>}
 */
export async function pickMultiplePhotos({ quality = 80, width = 1200, height = 1200, limit = 5 } = {}) {
  const plugins = await loadPlugin();
  if (!plugins) return [];

  const { Camera: cam } = plugins;

  try {
    const result = await cam.pickImages({
      quality,
      width,
      height,
      limit,
    });

    log(`Picked ${result.photos.length} photos`);
    return result.photos.map((p) => ({
      dataUrl: p.dataUrl || null,
      webPath: p.webPath,
      format: p.format,
    }));
  } catch (err) {
    if (err?.message?.includes("cancelled") || err?.message?.includes("User cancelled")) {
      return [];
    }
    log("Multi-pick error:", err);
    throw err;
  }
}

/**
 * Check camera permissions.
 * @returns {Promise<{ camera: string, photos: string }>}
 */
export async function checkCameraPermissions() {
  const plugins = await loadPlugin();
  if (!plugins) return { camera: "unavailable", photos: "unavailable" };

  try {
    const perms = await plugins.Camera.checkPermissions();
    return { camera: perms.camera, photos: perms.photos };
  } catch {
    return { camera: "unavailable", photos: "unavailable" };
  }
}

/**
 * Request camera permissions explicitly.
 * @returns {Promise<{ camera: string, photos: string }>}
 */
export async function requestCameraPermissions() {
  const plugins = await loadPlugin();
  if (!plugins) return { camera: "unavailable", photos: "unavailable" };

  try {
    const perms = await plugins.Camera.requestPermissions();
    return { camera: perms.camera, photos: perms.photos };
  } catch {
    return { camera: "unavailable", photos: "unavailable" };
  }
}

/**
 * Convert a data URL to a File object for upload.
 * @param {string} dataUrl
 * @param {string} filename
 * @returns {File}
 */
export function dataUrlToFile(dataUrl, filename = "photo.jpg") {
  const [header, base64Data] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}
