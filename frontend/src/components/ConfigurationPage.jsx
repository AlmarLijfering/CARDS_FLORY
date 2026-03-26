import { useState } from 'react';

import { EmptyState } from './EmptyState';
import { useAppState } from '../lib/app-state';
import { ConfigurationModuleCard } from './configuration/ConfigurationModuleCard';


export function ConfigurationPage() {
  const { config, configError, exportBundle, isConfigLoading } = useAppState();
  const [exportStatus, setExportStatus] = useState('');

  function handleExportConfiguration() {
    const bundle = exportBundle();
    const blob = new Blob([bundle], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'therapy_cards_configuration.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setExportStatus('Configuration exported.');
    window.setTimeout(() => setExportStatus(''), 1800);
  }

  if (isConfigLoading) {
    return <section className="surface px-6 py-8 text-sm font-semibold text-slate-600">Loading configuration...</section>;
  }

  if (configError) {
    return (
      <EmptyState
        title="Configuration unavailable"
        description={configError}
        tone="warning"
      />
    );
  }

  const assignedCardCount = Object.keys(config.cardLabels).length;

  return (
    <section className="space-y-6">
      <div className="surface px-6 py-8 md:px-8 md:py-10">
        <p className="eyebrow">Configuration</p>
        <h2 className="page-title mt-3">Admin setup</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          This area controls shared application setup. Workspace access, label definitions, card assignments, and exported configuration are now stored centrally instead of per browser.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700">
            App {config.selectCardsBlocked ? 'blocked' : 'available'}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700">
            {assignedCardCount} cards labeled
          </span>
        </div>
        {exportStatus ? (
          <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
            {exportStatus}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ConfigurationModuleCard
          title="Workspace Access"
          description="Control whether the client session workspace can be opened at all."
          accentClassName="bg-brand-100 text-brand-700"
          iconLabel="A"
          to="/configuration/workspace"
          actionLabel="Open workspace access"
        />
        <ConfigurationModuleCard
          title="Session Management"
          description="Create client session links, review active sessions, and clear expired or open sessions."
          accentClassName="bg-accent-100 text-accent-700"
          iconLabel="B"
          to="/configuration/sessions"
          actionLabel="Open session management"
        />
        <ConfigurationModuleCard
          title="Theme Labels"
          description="Edit the six shared labels in English, Dutch, and Romanian."
          accentClassName="bg-emerald-100 text-emerald-700"
          iconLabel="C"
          to="/configuration/themes"
          actionLabel="Open theme labels"
        />
        <ConfigurationModuleCard
          title="Card Labels"
          description="Assign the shared labels to cards so the session filter groups stay consistent for everyone."
          accentClassName="bg-amber-100 text-amber-700"
          iconLabel="D"
          to="/configuration/card-labels"
          actionLabel="Open card labels"
        />
        <ConfigurationModuleCard
          title="Export Configuration"
          description="Download the shared theme-label and card-label configuration as a JSON backup."
          accentClassName="bg-slate-200 text-slate-700"
          iconLabel="E"
          onAction={handleExportConfiguration}
          actionLabel="Export configuration"
        />
      </div>
    </section>
  );
}
