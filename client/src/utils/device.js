import { v4 as uuidv4 } from 'uuid';

export const getDeviceId = () => {
    let deviceId = localStorage.getItem('mhub_device_id');
    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem('mhub_device_id', deviceId);
    }
    return deviceId;
};
