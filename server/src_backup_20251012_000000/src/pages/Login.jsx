import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showSignIn, setShowSignIn] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // POST to /api/auth/login
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Login failed');
      // Optionally store token, redirect, etc.
      // POST login audit
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords;
          fetch(`${baseUrl}/api/login-audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: form.email,
              latitude,
              longitude,
              action: 'login',
              datetime: new Date().toISOString()
            })
          });
        });
      }
      navigate('/');
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (showSignIn) {
    // Render SignIn form inline
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center">
        <button className="absolute top-4 right-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setShowSignIn(false)}>
          Go to Login
        </button>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const res = await fetch(`${baseUrl}/api/auth/signin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error('Sign in failed');
            navigate('/');
          } catch (err) {
            setError('Sign in failed');
          } finally {
            setLoading(false);
          }
        }} className="w-full max-w-sm mx-auto flex flex-col gap-4 p-8 bg-white rounded shadow">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Sign In</h2>
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} className="border rounded p-2" required />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} className="border rounded p-2" required />
          {error && <span className="text-red-500 text-xs">{error}</span>}
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center">
      <button className="absolute top-4 right-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setShowSignIn(true)}>
        Go to Sign Up
      </button>
      <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto flex flex-col gap-4 p-8 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Login</h2>
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} className="border rounded p-2" required />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} className="border rounded p-2" required />
        {error && <span className="text-red-500 text-xs">{error}</span>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
    </div>
  );
};

export default Login;
