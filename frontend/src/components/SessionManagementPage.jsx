import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from './EmptyState';
import { useAppState } from '../lib/app-state';
import { clearAllActiveSessions, createSessionLink, getActiveSessions } from '../lib/sessionLinksApi';


export function SessionManagementPage() {
  const { clearAllSessions, isAuthenticated, isAuthLoading } = useAppState();
  const [sessionLink, setSessionLink] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isLoadingActiveSessions, setIsLoadingActiveSessions] = useState(true);
  const [isClearingSessions, setIsClearingSessions] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy link');
  const [copiedSessionKey, setCopiedSessionKey] = useState('');

  useEffect(() => {
    loadActiveSessions();
  }, []);

  async function loadActiveSessions() {
    setErrorMessage('');
    setIsLoadingActiveSessions(true);

    try {
      const result = await getActiveSessions();
      setActiveSessions(result);
      return result;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load active sessions.');
      return [];
    } finally {
      setIsLoadingActiveSessions(false);
    }
  }

  async function handleCreateSessionLink() {
    setIsCreatingLink(true);
    setErrorMessage('');
    setStatusMessage('');
    setCopyLabel('Copy link');

    try {
      const result = await createSessionLink();
      setSessionLink(result);
      await loadActiveSessions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create a session link.');
    } finally {
      setIsCreatingLink(false);
    }
  }

  async function handleClearSessions() {
    setIsClearingSessions(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const result = await clearAllActiveSessions();
      clearAllSessions();
      setSessionLink(null);
      setActiveSessions([]);
      setStatusMessage(`${result.cleared_count} active session${result.cleared_count === 1 ? '' : 's'} cleared.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to clear active sessions.');
    } finally {
      setIsClearingSessions(false);
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

  if (isAuthLoading) {
    return <section className="surface px-6 py-8 text-sm font-semibold text-slate-600">Checking admin session...</section>;
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Login required"
        description="Session management is only available when you are logged in as an admin."
        tone="warning"
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="surface px-6 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="eyebrow">Configuration</p>
            <h2 className="page-title mt-3">Session management</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Create 24-hour client links, review all currently active sessions, and clear them when needed. Expired sessions are removed automatically whenever this page is opened or refreshed.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/configuration" className="action-chip">
              Back to configuration
            </Link>
            <button type="button" className="action-chip" onClick={loadActiveSessions} disabled={isLoadingActiveSessions}>
              {isLoadingActiveSessions ? 'Refreshing...' : 'Refresh sessions'}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
            {statusMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Create session</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Generate a unique client session link that stays active for 24 hours.
                </p>
              </div>
              <button
                type="button"
                className="action-chip action-chip-active"
                onClick={handleCreateSessionLink}
                disabled={isCreatingLink}
              >
                {isCreatingLink ? 'Creating...' : 'Create session'}
              </button>
            </div>

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

          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Clear sessions</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Remove all active session links and clear the local session state saved in this browser.
                </p>
              </div>
              <button type="button" className="action-chip" onClick={handleClearSessions} disabled={isClearingSessions}>
                {isClearingSessions ? 'Clearing...' : 'Clear sessions'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="surface px-6 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Active Sessions</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Overview sessions</h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            {activeSessions.length} active
          </span>
        </div>

        {isLoadingActiveSessions ? (
          <div className="mt-6 text-sm font-semibold text-slate-600">Loading active sessions...</div>
        ) : activeSessions.length ? (
          <div className="mt-6 space-y-3">
            {activeSessions.map((session) => (
              <div key={session.session_key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{session.session_key}</p>
                    <p className="mt-1">
                      <span className="font-semibold text-slate-900">Expires:</span> {new Date(session.expires_at).toLocaleString()}
                    </p>
                    {session.session_url ? (
                      <p className="mt-2 break-all">
                        <span className="font-semibold text-slate-900">Share URL:</span> {session.session_url}
                      </p>
                    ) : null}
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
          <div className="mt-6">
            <EmptyState
              title="No active sessions"
              description="Create a session link above when you want to open a new client session."
            />
          </div>
        )}
      </div>
    </section>
  );
}
