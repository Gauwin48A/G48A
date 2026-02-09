import axios from 'axios';
import { getDeviceId } from '@/utils/device'; // Ensure this matches your alias

// 1. Create Axios Instance
// IMPORTANT: baseURL includes /api so routes like '/auth/login' become '/api/auth/login'
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // For HttpOnly Cookies
});

// 2. Request Interceptor (The Defender Gate)
api.interceptors.request.use(
    (config) => {
        // A. Attach Access Token (if using localStorage fallback)
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // B. Attach Device Fingerprint (Protocol: Velocity Block)
        const deviceId = getDeviceId();
        if (deviceId) {
            config.headers['X-Device-Id'] = deviceId;
        }

        // C. Attach Timezone (Fraud Detection)
        config.headers['X-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;

        return config;
    },
    (error) => Promise.reject(error)
);

// 3. Response Interceptor (The Error Shield)
api.interceptors.response.use(
    (response) => {
        // Unwrap response data for cleaner usage in components
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        // A. Handle Token Expiry (401) - Auto Refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Attempt refresh
                const refreshToken = localStorage.getItem('refreshToken') // Or cookie
                // Note: With HttpOnly cookies, the /refresh-token endpoint usually reads the cookie automatically

                const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/refresh-token`, {}, { withCredentials: true });

                if (res.status === 200) {
                    // If using localStorage token
                    if (res.data.token) localStorage.setItem('authToken', res.data.token);

                    // Retry original request
                    originalRequest.headers['Authorization'] = `Bearer ${res.data.token}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed - Force Logout
                localStorage.clear();
                window.location.href = '/login?expired=true';
                return Promise.reject(refreshError);
            }
        }

        // B. Handle Velocity Block / Device Lock (403)
        if (error.response?.status === 403 && error.response?.data?.error === 'Login Blocked') {
            window.location.href = '/security-lockout'; // Special page for scammers
        }

        // C. Global Error Simplification
        // Return a standardized error object to the UI
        const customError = {
            message: error.response?.data?.error || error.response?.data?.message || 'Something went wrong',
            status: error.response?.status,
            original: error
        };

        return Promise.reject(customError);
    }
);

export default api;
