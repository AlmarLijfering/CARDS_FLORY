import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { EmptyState } from './EmptyState';
import { useAppState } from '../lib/app-state';


export function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, isAuthenticated, login, logout, sessionPath } = useAppState();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const redirectTarget = typeof location.state?.from === 'string' ? location.state.from : '/configuration';

  function handleLogin(event) {
    event.preventDefault();
    login();
    navigate(redirectTarget, { replace: true });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="surface px-6 py-8 md:px-8 md:py-10">
        <p className="eyebrow">Session Flow</p>
        <h2 className="page-title mt-3">Choose where you want to work.</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Open the session workspace directly for card selection, or sign in to access configuration on this device.
        </p>
        <div className="mt-8">
          <Link
            to={sessionPath}
            className={`surface-muted group flex min-h-56 flex-col justify-between p-6 transition ${
              config.selectCardsBlocked ? 'pointer-events-none opacity-60' : 'hover:-translate-y-1 hover:shadow-card'
            }`}
          >
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
              <span className="text-xl font-bold">01</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Open Select Cards</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Build a live selection of up to six cards with click, keyboard, or drag-and-drop.
              </p>
            </div>
            <span className="mt-4 text-sm font-semibold text-brand-700">
              {config.selectCardsBlocked ? 'Blocked in configuration' : 'Start a session'}
            </span>
          </Link>
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
            <p className="text-sm leading-7 text-slate-600">
              Login is used only to unlock configuration in this browser. Username and password are not validated yet.
            </p>
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
            <button type="submit" className="action-chip action-chip-active">
              Login
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
