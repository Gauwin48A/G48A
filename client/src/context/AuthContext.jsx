import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Initialize: Verify token with server
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (token) {
                    // Verify with server (The Defender way)
                    const userData = await api.get('/auth/me');
                    setUser(userData);
                }
            } catch (err) {
                // Token invalid or expired
                console.log('Session restoration failed:', err);
                localStorage.removeItem('authToken');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    // 2. Login Action
    const login = async (phone, password) => {
        try {
            // Use phone_number as per controller
            const res = await api.post('/auth/login', { phone, password });
            const { token, user: userData } = res; // api.js unwraps data

            localStorage.setItem('authToken', token);
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
        setUser(null);
        window.location.href = '/login'; // Force redirect
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
