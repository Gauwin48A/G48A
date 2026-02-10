import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check auth with server
    const checkAuth = useCallback(async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                // Verify with server (The Defender way)
                const userData = await api.get('/auth/me');
                setUser(userData);

                // SELF-HEALING: Restore userId if missing
                if (userData.id && !localStorage.getItem('userId')) {
                    localStorage.setItem('userId', userData.id);
                }

                return true;
            }
            return false;
        } catch (err) {
            // Token invalid or expired
            console.log('Session restoration failed:', err);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userId'); // Ensure clean state
            setUser(null);
            return false;
        }
    }, []);

    // 1. Initialize: Verify token with server
    useEffect(() => {
        const init = async () => {
            await checkAuth();
            setLoading(false);
        };
        init();
    }, [checkAuth]);

    // 2. Login Action (for use with AuthContext login flow)
    const login = async (phone, password) => {
        try {
            // Use phone_number as per controller
            const res = await api.post('/auth/login', { phone, password });
            const { token, user: userData } = res; // api.js unwraps data

            localStorage.setItem('authToken', token);
            localStorage.setItem('userId', userData.id); // Fix: Store userId
            setUser(userData);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message || "Login failed" };
        }
    };

    // 3. Signup Action
    const signup = async (data) => {
        try {
            const res = await api.post('/auth/signup', data);
            return { success: true, message: res.message };
        } catch (err) {
            return { success: false, error: err.message || "Signup failed" };
        }
    }

    // 4. Logout Action (Secure Destruction)
    const logout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        setUser(null);
        window.location.href = '/login'; // Force redirect
    };

    // 5. Refresh Auth (re-check with server without page reload)
    const refreshAuth = async () => {
        return await checkAuth();
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, signup, logout, loading, refreshAuth }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
