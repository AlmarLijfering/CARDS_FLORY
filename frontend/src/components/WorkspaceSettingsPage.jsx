import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from './EmptyState';
import { useAppState } from '../lib/app-state';


export function WorkspaceSettingsPage() {
  const { config, configError, isConfigLoading, setSelectCardsBlocked } = useAppState();
  const [draftBlocked, setDraftBlocked] = useState(config.selectCardsBlocked);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setDraftBlocked(config.selectCardsBlocked);
  }, [config.selectCardsBlocked]);

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      await setSelectCardsBlocked(draftBlocked);
      setStatusMessage(`App access ${draftBlocked ? 'blocked' : 'enabled'}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save workspace access.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isConfigLoading) {
    return <section className="surface px-6 py-8 text-sm font-semibold text-slate-600">Loading workspace access...</section>;
  }

  if (configError) {
    return (
      <EmptyState
        title="Workspace access unavailable"
        description={configError}
        tone="warning"
      />
    );
  }

  return (
    <section className="surface px-6 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2 className="page-title mt-3">Workspace access</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Use this setting to temporarily stop all client session links from opening. It affects the whole app, not just this browser.
          </p>
        </div>
        <Link to="/configuration" className="action-chip">
          Back to configuration
        </Link>
      </div>

      <form onSubmit={handleSave} className="mt-8 space-y-5">
        <label className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 rounded border-slate-300 text-brand-600"
            checked={draftBlocked}
            onChange={(event) => {
              setDraftBlocked(event.target.checked);
              setStatusMessage('');
              setErrorMessage('');
            }}
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">Block app</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              When enabled, no session link can open the selection workspace until this setting is turned off again.
            </p>
          </div>
        </label>

        {statusMessage ? (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="action-chip action-chip-active" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save workspace access'}
          </button>
        </div>
      </form>
    </section>
  );
}
