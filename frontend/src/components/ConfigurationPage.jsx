import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAppState } from '../lib/app-state';
import { clearAllActiveSessions, createSessionLink } from '../lib/sessionLinksApi';


export function ConfigurationPage() {
  const { clearAllSessions, config, setSelectCardsBlocked } = useAppState();
  const [sessionLink, setSessionLink] = useState(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isClearingSessions, setIsClearingSessions] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy link');

  async function handleCreateSessionLink() {
    setIsCreatingLink(true);
    setLinkError('');
    setStatusMessage('');
    setCopyLabel('Copy link');

    try {
      const result = await createSessionLink();
      setSessionLink(result);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Unable to create a session link.');
    } finally {
      setIsCreatingLink(false);
    }
  }

  async function handleCopyLink() {
    if (!sessionLink?.short_url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sessionLink.short_url);
      setCopyLabel('Copied');
      window.setTimeout(() => setCopyLabel('Copy link'), 1800);
    } catch (error) {
      setCopyLabel('Copy failed');
      window.setTimeout(() => setCopyLabel('Copy link'), 1800);
    }
  }

  async function handleClearSessions() {
    setIsClearingSessions(true);
    setLinkError('');
    setStatusMessage('');

    try {
      const result = await clearAllActiveSessions();
      clearAllSessions();
      setSessionLink(null);
      setStatusMessage(`${result.cleared_count} active session${result.cleared_count === 1 ? '' : 's'} cleared.`);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Unable to clear active sessions.');
    } finally {
      setIsClearingSessions(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="surface px-6 py-8 md:px-8 md:py-10">
        <p className="eyebrow">Configuration</p>
        <h2 className="page-title mt-3">Control the workspace.</h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
          Theme labels and card labels stay in this browser. Active custom sessions are tracked by the backend with expiry only, so no card selections or notes are stored on the server.
        </p>
        <label className="mt-8 flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 rounded border-slate-300 text-brand-600"
            checked={config.selectCardsBlocked}
            onChange={(event) => setSelectCardsBlocked(event.target.checked)}
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">Block Select Cards application</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              When enabled, the session workspace stays unavailable even if someone opens the route directly.
            </p>
          </div>
        </label>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Clear all active sessions</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Remove all currently active custom session links and clear the active session data stored in this browser.
              </p>
            </div>
            <button type="button" className="action-chip" onClick={handleClearSessions} disabled={isClearingSessions}>
              {isClearingSessions ? 'Clearing...' : 'Clear active sessions'}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Create 24-hour session link</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Generate a unique client session URL that expires after 24 hours. If TinyURL is configured on the backend, the shared link will be shortened automatically.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                TinyURL requires backend env vars `TINYURL_API_TOKEN`, optional `TINYURL_DOMAIN`, and `FRONTEND_APP_URL`.
              </p>
            </div>
            <button
              type="button"
              className="action-chip action-chip-active"
              onClick={handleCreateSessionLink}
              disabled={isCreatingLink}
            >
              {isCreatingLink ? 'Creating...' : 'Create session URL'}
            </button>
          </div>

          {linkError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {linkError}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
              {statusMessage}
            </div>
          ) : null}

          {sessionLink ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Expires:</span> {new Date(sessionLink.expires_at).toLocaleString()}
              </p>
              <p className="mt-2 break-all">
                <span className="font-semibold text-slate-900">Share URL:</span> {sessionLink.short_url}
              </p>
              {!sessionLink.used_tinyurl ? (
                <p className="mt-2 text-slate-500">
                  TinyURL is not configured, so the direct invite link is shown instead. Add `TINYURL_API_TOKEN` on the backend to enable shortening.
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" className="action-chip" onClick={handleCopyLink}>
                  {copyLabel}
                </button>
                <a className="action-chip" href={sessionLink.short_url} target="_blank" rel="noreferrer">
                  Open link
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Link
          to="/configuration/themes"
          className="surface-muted flex min-h-60 flex-col justify-between p-6 transition hover:-translate-y-1 hover:shadow-card"
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <span className="text-xl font-bold">A</span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Theme Labels</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Edit the six theme labels in English, Dutch, and Romanian.
            </p>
          </div>
        </Link>
        <Link
          to="/configuration/card-labels"
          className="surface-muted flex min-h-60 flex-col justify-between p-6 transition hover:-translate-y-1 hover:shadow-card"
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
            <span className="text-xl font-bold">B</span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Card Labels</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Assign one or more of the six labels to each card, then export or import the bundle.
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}
