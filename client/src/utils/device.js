import { v4 as uuidv4 } from 'uuid'; // npm install uuid

// Generates or retrieves a stable ID for this specific phone/browser
export const getDeviceId = () => {
    let deviceId = localStorage.getItem('mhub_device_id');
    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem('mhub_device_id', deviceId);
    }
    return deviceId;
};
