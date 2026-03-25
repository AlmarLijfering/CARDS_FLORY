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
    updateSessionContext
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
    <section className="surface px-4 py-4 md:px-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Finalize Session</p>
          <h2 className="page-title mt-2">Review cards and add session notes.</h2>
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

      <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4">
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Add notes for the selection
          <textarea
            value={sessionContext.notes}
            onChange={(event) => updateSessionContext({ notes: event.target.value })}
            rows={6}
            className="mt-2 w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm"
            placeholder="Add notes related to the selected cards"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {selectedCardObjects.map((card, index) => (
          <article key={card.id} className="surface-muted flex min-w-0 flex-col gap-2 p-2.5">
            <div className="relative overflow-hidden rounded-[18px] bg-slate-100">
              <img src={card.largeImage} alt={card.title} className="aspect-[4/5] w-full object-cover" />
              <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow">
                #{card.id}
              </div>
              <div className="absolute right-2 top-2 rounded-full bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white">
                {index + 1}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
