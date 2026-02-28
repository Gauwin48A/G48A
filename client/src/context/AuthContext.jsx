import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';
import { getAccessToken } from '@/utils/authStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUserState] = useState(() => {
        try {
            const cachedUser = localStorage.getItem('user');
            return cachedUser ? JSON.parse(cachedUser) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    const resolveUserId = useCallback((userData) => {
        const candidate = userData?.id ?? userData?.user_id ?? null;
        if (candidate === null || candidate === undefined || candidate === '') {
            return null;
        }
        return String(candidate);
    }, []);

    const getStoredAccessToken = useCallback(() => {
        return getAccessToken();
    }, []);

    const setUser = useCallback((nextUser) => {
        setUserState((previousUser) => {
            const resolvedUser = typeof nextUser === 'function' ? nextUser(previousUser) : nextUser;

            if (resolvedUser && typeof resolvedUser === 'object') {
                localStorage.setItem('user', JSON.stringify(resolvedUser));
                const resolvedUserId = resolveUserId(resolvedUser);
                if (resolvedUserId) {
                    localStorage.setItem('userId', resolvedUserId);
                    localStorage.setItem('user_id', resolvedUserId);
                }
                return resolvedUser;
            }

            localStorage.removeItem('user');
            localStorage.removeItem('userId');
            localStorage.removeItem('user_id');
            return null;
        });
    }, [resolveUserId]);

    const clearAuthState = useCallback(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('user_id');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('token');
        setUserState(null);
    }, []);

    const refreshSession = useCallback(async () => {
        try {
            const refreshed = await api.post('/auth/refresh-token', {});
            if (!refreshed?.token) {
                return false;
            }

            localStorage.setItem('authToken', refreshed.token);
            localStorage.removeItem('token');

            if (refreshed.refreshToken) {
                localStorage.setItem('refreshToken', refreshed.refreshToken);
            }

            if (refreshed.user) {
                setUser(refreshed.user);
            }

            return true;
        } catch {
            return false;
        }
    }, [setUser]);

    // Check auth with server
    const checkAuth = useCallback(async () => {
        const loadAuthenticatedUser = async () => {
            const userData = await api.get('/auth/me');
            setUser(userData);
            return true;
        };

        let token = getStoredAccessToken();

        if (!token) {
            const refreshed = await refreshSession();
            token = getStoredAccessToken();
            if (!refreshed || !token) {
                clearAuthState();
                return false;
            }
        }

        try {
            return await loadAuthenticatedUser();
        } catch (err) {
            const status = err?.status ?? err?.response?.status ?? null;
            const isAuthFailure = status === 401 || status === 403;

            if (isAuthFailure) {
                const refreshed = await refreshSession();
                if (refreshed) {
                    try {
                        return await loadAuthenticatedUser();
                    } catch {
                        clearAuthState();
                        return false;
                    }
                }
            }

            // Preserve cached session on temporary network errors.
            if (!status) {
                try {
                    const cachedUser = localStorage.getItem('user');
                    if (cachedUser) {
                        setUserState(JSON.parse(cachedUser));
                        return true;
                    }
                } catch {
                    // Ignore corrupted cache and clear state below.
                }
            }

            clearAuthState();
            return false;
        }
    }, [clearAuthState, getStoredAccessToken, refreshSession, setUser]);

    // 1. Initialize: Verify token with server
    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            await checkAuth();
            if (isMounted) {
                setLoading(false);
            }
        };

        init();

        return () => {
            isMounted = false;
        };
    }, [checkAuth]);

    // 2. Login Action (for use with AuthContext login flow)
    const login = async (identifier, password) => {
        try {
            const res = await api.post('/auth/login', { identifier, password });
            const { token, user: userData } = res; // api.js unwraps data

            if (!token) {
                return { success: false, error: "Login failed: missing access token" };
            }

            localStorage.setItem('authToken', token);
            localStorage.removeItem('token');

            if (res?.refreshToken) {
                localStorage.setItem('refreshToken', res.refreshToken);
            }

            if (userData) {
                setUser(userData);
            }

            return { success: true, user: userData || null };
        } catch (err) {
            return { success: false, error: err.message || "Login failed" };
        }
    };

    // 3. Signup Action
    const signup = async (data) => {
        try {
            const res = await api.post('/auth/signup', data);

            if (res?.token) {
                localStorage.setItem('authToken', res.token);
                localStorage.removeItem('token');
            }
            if (res?.refreshToken) {
                localStorage.setItem('refreshToken', res.refreshToken);
            }
            if (res?.user) {
                setUser(res.user);
            }

            return { success: true, message: res.message, user: res.user || null };
        } catch (err) {
            return { success: false, error: err.message || "Signup failed" };
        }
    };

    // 4. Logout Action (Secure Destruction)
    const logout = async () => {
        try {
            await api.post('/auth/logout', {
                refreshToken: localStorage.getItem('refreshToken') || undefined
            });
        } catch {
            // Ignore network/logout API errors and clear client state anyway.
        } finally {
            clearAuthState();
        }
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
