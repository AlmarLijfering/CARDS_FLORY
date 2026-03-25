import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cardCatalog } from '../data/cardCatalog';
import { buildPdfPayload } from '../lib/insights';
import { useAppState } from '../lib/app-state';
import { downloadPdf } from '../lib/pdfApi';
import { EmptyState } from './EmptyState';


export function OverviewPage() {
  const navigate = useNavigate();
  const {
    activeSessionKey,
    config,
    language,
    selectedCards,
    sessionContext,
    sessionPath,
    updateSessionContext,
    getCardLabelNames
  } = useAppState();
  const [isPrinting, setIsPrinting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (config.selectCardsBlocked) {
    return (
      <EmptyState
        title="Session is blocked"
        description="This session link is currently disabled in local configuration, so finalize and print are unavailable."
        actionLabel="Open configuration"
        onAction={() => navigate('/configuration')}
        tone="warning"
      />
    );
  }

  if (!selectedCards.length) {
    return (
      <EmptyState
        title="No cards selected yet"
        description="Choose at least one card in the session page before opening finalize session."
        actionLabel="Open Session"
        onAction={() => navigate(sessionPath)}
      />
    );
  }

  const selectedCardObjects = selectedCards
    .map((cardId) => cardCatalog.find((card) => card.id === cardId))
    .filter(Boolean);

  async function handlePrint() {
    setIsPrinting(true);
    setErrorMessage('');
    try {
      const payload = buildPdfPayload({
        selectedCards,
        cardCatalog,
        cardLabels: config.cardLabels,
        themeLabels: config.themeLabels,
        language,
        sessionContext,
        sessionKey: activeSessionKey
      });
      await downloadPdf(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to generate the PDF report.');
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <section className="surface px-6 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Finalize Session</p>
          <h2 className="page-title mt-3">Review cards and add session notes.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            This page is intentionally simple: your selected cards, one notes field, and the PDF action.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="action-chip" onClick={() => navigate(sessionPath)}>
            Back to session
          </button>
          <button type="button" className="action-chip action-chip-active" disabled={isPrinting} onClick={handlePrint}>
            {isPrinting ? 'Preparing PDF...' : 'Print to PDF'}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-5">
        <p className="text-sm font-semibold text-slate-900">
          {activeSessionKey === 'default' ? 'Default session' : `Session: ${activeSessionKey}`}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Session notes stay only in this browser session until you print the PDF.
        </p>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Session notes
          <textarea
            value={sessionContext.notes}
            onChange={(event) => updateSessionContext({ notes: event.target.value })}
            rows={6}
            className="mt-2 w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm"
            placeholder="Add notes for the session report"
          />
        </label>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {selectedCardObjects.map((card, index) => (
          <article key={card.id} className="surface-muted flex min-w-0 flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {index + 1}
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Card #{card.id}</p>
            </div>
            <div className="overflow-hidden rounded-[20px] bg-slate-100">
              <img src={card.largeImage} alt={card.title} className="aspect-[4/5] w-full object-cover" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900">{card.title}</h3>
              <p className="truncate text-xs text-slate-500">
                {getCardLabelNames(card.id).length ? getCardLabelNames(card.id).join(' • ') : 'No labels assigned yet'}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
