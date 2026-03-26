import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { EmptyState } from './EmptyState';
import { useAppState } from '../lib/app-state';
import { loginWithBackend } from '../lib/authApi';


export function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, isAuthenticated, login, logout } = useAppState();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTarget = typeof location.state?.from === 'string' ? location.state.from : '/configuration';

  async function handleLogin(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError('');

    try {
      await loginWithBackend(username, password);
      login();
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to log in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="surface px-6 py-8 md:px-8 md:py-10">
        <p className="eyebrow">Session Flow</p>
        <h2 className="page-title mt-3">Choose where you want to work.</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Clients can only access a session through a valid session link created by an admin. Sign in to access configuration on this device.
        </p>
        <div className="mt-8">
          <div className={`surface-muted flex min-h-56 flex-col justify-between p-6 ${config.selectCardsBlocked ? 'opacity-70' : ''}`}>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
              <span className="text-xl font-bold">01</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Use a Session Link</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                A client session opens only from a 24-hour session URL generated in Configuration by an admin.
              </p>
            </div>
            <span className="mt-4 text-sm font-semibold text-brand-700">{config.selectCardsBlocked ? 'Session links are currently blocked' : 'Waiting for a session link'}</span>
          </div>
        </div>
      </section>
      <section className="surface px-6 py-8 md:px-8 md:py-10">
        <p className="eyebrow">Admin Access</p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">Configuration access</h2>
        {isAuthenticated ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-7 text-slate-600">
              You are signed in on this browser and can manage theme labels, card labels, and workspace blocking.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/configuration" className="action-chip action-chip-active">
                Open configuration
              </Link>
              <button type="button" className="action-chip" onClick={logout}>
                Log out
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <p className="text-sm leading-7 text-slate-600">Login is required to unlock configuration on this device.</p>
            <label className="block text-sm font-semibold text-slate-700">
              Username
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
                autoComplete="username"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
                autoComplete="current-password"
              />
            </label>
            {loginError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{loginError}</div> : null}
            <button type="submit" className="action-chip action-chip-active" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}
        {config.selectCardsBlocked ? (
          <div className="mt-8">
            <EmptyState
              title="Session workspace is blocked"
              description="The session route is currently disabled in local configuration on this browser."
              actionLabel={isAuthenticated ? 'Open configuration' : undefined}
              onAction={isAuthenticated ? () => navigate('/configuration') : undefined}
              tone="warning"
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
