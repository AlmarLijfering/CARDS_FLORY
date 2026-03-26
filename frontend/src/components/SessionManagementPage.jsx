import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from './EmptyState';
import { useAppState } from '../lib/app-state';
import { clearAllActiveSessions, createSessionLink, getActiveSessions } from '../lib/sessionLinksApi';
import { getAvailableSessionLabels, getSessionLabelName } from '../lib/sessionLabels';
import { getSessionUiText } from '../lib/sessionUiText';


export function SessionManagementPage() {
  const { clearAllSessions, config, configError, isAuthenticated, isAuthLoading, isConfigLoading, language } = useAppState();
  const text = getSessionUiText(language);
  const availableSessionLabels = getAvailableSessionLabels(config, language);
  const [sessionLink, setSessionLink] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [sessionLabelId, setSessionLabelId] = useState(availableSessionLabels[0]?.id || 1);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isLoadingActiveSessions, setIsLoadingActiveSessions] = useState(true);
  const [isClearingSessions, setIsClearingSessions] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [copyLabel, setCopyLabel] = useState(text.common.copyLink);
  const [copiedSessionKey, setCopiedSessionKey] = useState('');

  useEffect(() => {
    loadActiveSessions();
  }, []);

  useEffect(() => {
    setCopyLabel(text.common.copyLink);
  }, [text.common.copyLink]);

  useEffect(() => {
    if (!availableSessionLabels.some((label) => label.id === Number(sessionLabelId))) {
      setSessionLabelId(availableSessionLabels[0]?.id || 1);
    }
  }, [availableSessionLabels, sessionLabelId]);

  async function loadActiveSessions() {
    setErrorMessage('');
    setIsLoadingActiveSessions(true);

    try {
      const result = await getActiveSessions();
      setActiveSessions(result);
      return result;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.sessionManagement.loadSessionsError);
      return [];
    } finally {
      setIsLoadingActiveSessions(false);
    }
  }

  async function handleCreateSessionLink() {
    setIsCreatingLink(true);
    setErrorMessage('');
    setStatusMessage('');
    setCopyLabel(text.common.copyLink);

    try {
      const result = await createSessionLink(sessionName, sessionLabelId);
      setSessionLink(result);
      setSessionName('');
      await loadActiveSessions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.sessionManagement.createLinkError);
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
      setStatusMessage(
        `${result.cleared_count} ${result.cleared_count === 1
          ? text.sessionManagement.sessionClearedSingular
          : text.sessionManagement.sessionClearedPlural}`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.sessionManagement.clearSessionsError);
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
      setCopyLabel(text.common.copied);
      window.setTimeout(() => setCopyLabel(text.common.copyLink), 1800);
    } catch (error) {
      setCopyLabel(text.common.copyFailed);
      window.setTimeout(() => setCopyLabel(text.common.copyLink), 1800);
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
    return <section className="surface px-6 py-8 text-sm font-semibold text-slate-600">{text.sessionManagement.loadingAuth}</section>;
  }

  if (isConfigLoading) {
    return <section className="surface px-6 py-8 text-sm font-semibold text-slate-600">{text.sessionManagement.loadingConfiguration}</section>;
  }

  if (configError) {
    return (
      <EmptyState
        title={text.sessionManagement.configurationUnavailableTitle}
        description={configError}
        tone="warning"
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title={text.sessionManagement.loginRequiredTitle}
        description={text.sessionManagement.loginRequiredDescription}
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
            <h2 className="page-title mt-3">{text.sessionManagement.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              {text.sessionManagement.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/configuration" className="action-chip">
              {text.sessionManagement.backToConfiguration}
            </Link>
            <button type="button" className="action-chip" onClick={loadActiveSessions} disabled={isLoadingActiveSessions}>
              {isLoadingActiveSessions ? text.sessionManagement.refreshingSessions : text.sessionManagement.refreshSessions}
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
                <p className="text-sm font-semibold text-slate-900">{text.sessionManagement.createSession}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {text.sessionManagement.createDescription}
                </p>
              </div>
              <button
                type="button"
                className="action-chip action-chip-active"
                onClick={handleCreateSessionLink}
                disabled={isCreatingLink || !sessionName.trim() || !availableSessionLabels.length}
              >
                {isCreatingLink ? text.sessionManagement.creatingButton : text.sessionManagement.createButton}
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                {text.common.sessionName}
                <input
                  type="text"
                  value={sessionName}
                  onChange={(event) => setSessionName(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
                  placeholder={text.sessionManagement.sessionNamePlaceholder}
                  maxLength={120}
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                {text.common.label}
                <select
                  value={sessionLabelId}
                  onChange={(event) => setSessionLabelId(Number(event.target.value))}
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
                  disabled={!availableSessionLabels.length}
                >
                  {availableSessionLabels.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} ({option.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!availableSessionLabels.length ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                {text.sessionManagement.noLabelsAssigned}
              </div>
            ) : null}

            {sessionLink ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">{text.common.expires}:</span> {new Date(sessionLink.expires_at).toLocaleString()}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-slate-900">{text.common.sessionName}:</span> {sessionLink.session_name}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-slate-900">{text.common.label}:</span> {getSessionLabelName(config, sessionLink.session_label_id, language)}
                </p>
                <p className="mt-2 break-all">
                  <span className="font-semibold text-slate-900">{text.common.shareUrl}:</span> {sessionLink.session_url}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" className="action-chip" onClick={handleCopyLink}>
                    {copyLabel}
                  </button>
                  <a className="action-chip" href={sessionLink.session_url} target="_blank" rel="noreferrer">
                    {text.common.openLink}
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{text.sessionManagement.clearSessions}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {text.sessionManagement.clearDescription}
                </p>
              </div>
              <button type="button" className="action-chip" onClick={handleClearSessions} disabled={isClearingSessions}>
                {isClearingSessions ? text.sessionManagement.clearingButton : text.sessionManagement.clearSessions}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="surface px-6 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Active Sessions</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{text.sessionManagement.overviewSessions}</h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            {activeSessions.length} {text.sessionManagement.activeCountSuffix}
          </span>
        </div>

        {isLoadingActiveSessions ? (
          <div className="mt-6 text-sm font-semibold text-slate-600">{text.sessionManagement.loadingSessions}</div>
        ) : activeSessions.length ? (
          <div className="mt-6 space-y-3">
            {activeSessions.map((session) => (
              <div key={session.session_key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{session.session_key}</p>
                    <p className="mt-1">
                      <span className="font-semibold text-slate-900">{text.common.sessionName}:</span> {session.session_name}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-slate-900">{text.common.expires}:</span> {new Date(session.expires_at).toLocaleString()}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-slate-900">{text.common.label}:</span> {getSessionLabelName(config, session.session_label_id, language)}
                    </p>
                    {session.session_url ? (
                      <p className="mt-2 break-all">
                        <span className="font-semibold text-slate-900">{text.common.shareUrl}:</span> {session.session_url}
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
                          ? text.common.copied
                          : copiedSessionKey === `failed:${session.session_key}`
                            ? text.common.copyFailed
                            : text.common.copyLink}
                      </button>
                      <a className="action-chip" href={session.session_url} target="_blank" rel="noreferrer">
                        {text.common.openLink}
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
              title={text.sessionManagement.noActiveSessionsTitle}
              description={text.sessionManagement.noActiveSessionsDescription}
            />
          </div>
        )}
      </div>
    </section>
  );
}
