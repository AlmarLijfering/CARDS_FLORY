import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAppState } from '../lib/app-state';
import { clearAllActiveSessions, createSessionLink, getActiveSessions } from '../lib/sessionLinksApi';


export function ConfigurationPage() {
  const { clearAllSessions, config, setSelectCardsBlocked } = useAppState();
  const [sessionLink, setSessionLink] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [hasLoadedActiveSessions, setHasLoadedActiveSessions] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isLoadingActiveSessions, setIsLoadingActiveSessions] = useState(false);
  const [isClearingSessions, setIsClearingSessions] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy link');
  const [copiedSessionKey, setCopiedSessionKey] = useState('');

  async function loadActiveSessions() {
    setLinkError('');
    setIsLoadingActiveSessions(true);

    try {
      const result = await getActiveSessions();
      setActiveSessions(result);
      setHasLoadedActiveSessions(true);
      return result;
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Unable to load active sessions.');
      return [];
    } finally {
      setIsLoadingActiveSessions(false);
    }
  }

  async function handleCreateSessionLink() {
    setIsCreatingLink(true);
    setLinkError('');
    setStatusMessage('');
    setCopyLabel('Copy link');

    try {
      const result = await createSessionLink();
      setSessionLink(result);
      await loadActiveSessions();
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Unable to create a session link.');
    } finally {
      setIsCreatingLink(false);
    }
  }

  async function handleCopyLink() {
    if (!sessionLink?.session_url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sessionLink.session_url);
      setCopyLabel('Copied');
      window.setTimeout(() => setCopyLabel('Copy link'), 1800);
    } catch (error) {
      setCopyLabel('Copy failed');
      window.setTimeout(() => setCopyLabel('Copy link'), 1800);
    }
  }

  async function handleCopyActiveSessionLink(sessionKey, sessionUrl) {
    if (!sessionUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sessionUrl);
      setCopiedSessionKey(sessionKey);
      window.setTimeout(() => setCopiedSessionKey(''), 1800);
    } catch (error) {
      setCopiedSessionKey(`failed:${sessionKey}`);
      window.setTimeout(() => setCopiedSessionKey(''), 1800);
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
      setActiveSessions([]);
      setHasLoadedActiveSessions(true);
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
                Generate a unique client session URL that expires after 24 hours.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Set `FRONTEND_APP_URL` on the backend to the public app address, for example `https://apps.lijfering.eu`.
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
                <span className="font-semibold text-slate-900">Share URL:</span> {sessionLink.session_url}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" className="action-chip" onClick={handleCopyLink}>
                  {copyLabel}
                </button>
                <a className="action-chip" href={sessionLink.session_url} target="_blank" rel="noreferrer">
                  Open link
                </a>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Active sessions</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Open this list to review the currently active session links. Expired sessions are cleaned up automatically each time this list is loaded.
              </p>
            </div>
            <button
              type="button"
              className="action-chip"
              onClick={loadActiveSessions}
              disabled={isLoadingActiveSessions}
            >
              {isLoadingActiveSessions ? 'Loading...' : hasLoadedActiveSessions ? 'Refresh active sessions' : 'Show active sessions'}
            </button>
          </div>

          {hasLoadedActiveSessions ? (
            activeSessions.length ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  {activeSessions.length} active session{activeSessions.length === 1 ? '' : 's'}
                </p>
                {activeSessions.map((session) => (
                  <div key={session.session_key} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{session.session_key}</p>
                        <p className="mt-1">
                          <span className="font-semibold text-slate-900">Expires:</span>{' '}
                          {new Date(session.expires_at).toLocaleString()}
                        </p>
                        {session.session_url ? (
                          <p className="mt-2 break-all">
                            <span className="font-semibold text-slate-900">Share URL:</span> {session.session_url}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            This session is active, but no share URL is stored for it.
                          </p>
                        )}
                      </div>
                      {session.session_url ? (
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            className="action-chip"
                            onClick={() => handleCopyActiveSessionLink(session.session_key, session.session_url)}
                          >
                            {copiedSessionKey === session.session_key
                              ? 'Copied'
                              : copiedSessionKey === `failed:${session.session_key}`
                                ? 'Copy failed'
                                : 'Copy link'}
                          </button>
                          <a className="action-chip" href={session.session_url} target="_blank" rel="noreferrer">
                            Open link
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600">
                No active sessions right now. Create a session link above to open a new 24-hour client session.
              </div>
            )
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
