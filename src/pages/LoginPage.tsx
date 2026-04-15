import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function TaskFlowLogoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="8" fill="url(#logingrad)" />
      <path d="M8 10h12M8 14h8M8 18h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="18" r="4" fill="#fff" fillOpacity="0.3" />
      <path d="M19.5 18l1 1 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="logingrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === 'register' && !name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setGlobalError('');
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate('/projects');
    } catch (err: any) {
      if (err?.fields) setErrors(err.fields);
      else setGlobalError(err?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setErrors({});
    setGlobalError('');
  };

  const fillSeedCredentials = () => {
    setEmail('test@example.com');
    setPassword('password123');
    setMode('login');
    setErrors({});
    setGlobalError('');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      {/* Theme toggle in corner */}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        style={{ position: 'absolute', top: 20, right: 20 }}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="auth-card">
        <div className="auth-logo">
          <TaskFlowLogoIcon />
          TaskFlow
        </div>

        <h1 className="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to manage your projects and tasks'
            : 'Start organising your work in minutes'}
        </p>

        {globalError && (
          <div className="auth-error" role="alert">
            <span>⚠</span>
            {globalError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              {errors.name && <span className="form-error">⚠ {errors.name}</span>}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {errors.email && <span className="form-error">⚠ {errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className={`form-input ${errors.password ? 'input-error' : ''}`}
              placeholder={mode === 'login' ? '••••••••' : 'Min. 6 characters'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {errors.password && <span className="form-error">⚠ {errors.password}</span>}
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={isLoading}
            style={{ marginTop: 4 }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                {mode === 'login' ? 'Signing in…' : 'Creating account…'}
              </>
            ) : (
              mode === 'login' ? 'Sign in' : 'Create account'
            )}
          </button>
        </form>

        {mode === 'login' && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fillSeedCredentials}
              id="use-test-credentials-btn"
              type="button"
            >
              🧪 Use test credentials
            </button>
          </div>
        )}

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button type="button" onClick={switchMode} id="switch-to-register-btn">Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button type="button" onClick={switchMode} id="switch-to-login-btn">Sign in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
