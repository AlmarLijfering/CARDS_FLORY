import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cardCatalog } from '../data/cardCatalog';
import { buildPdfPayload, buildSelectionOrderSeries, buildThemeCoverage } from '../lib/insights';
import { useAppState } from '../lib/app-state';
import { downloadPdf } from '../lib/pdfApi';
import { EmptyState } from './EmptyState';
import { InsightCharts } from './InsightCharts';


export function OverviewPage() {
  const navigate = useNavigate();
  const { config, language, selectedCards, sessionContext, updateSessionContext, getCardLabelNames } = useAppState();
  const [isPrinting, setIsPrinting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (config.selectCardsBlocked) {
    return (
      <EmptyState
        title="Select Cards is blocked"
        description="The workspace is disabled in local configuration, so the overview is also unavailable."
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
        description="Choose at least one card in the session workspace before opening the overview."
        actionLabel="Open Select Cards"
        onAction={() => navigate('/select')}
      />
    );
  }

  const selectedCardObjects = selectedCards
    .map((cardId) => cardCatalog.find((card) => card.id === cardId))
    .filter(Boolean);

  const themeCoverage = buildThemeCoverage(selectedCards, config.cardLabels, config.themeLabels, language);
  const selectionOrder = buildSelectionOrderSeries(selectedCards);

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
        sessionContext
      });
      await downloadPdf(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to generate the PDF report.');
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="surface px-6 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="eyebrow">Overview</p>
            <h2 className="page-title mt-3">Confirm the final order.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Review the exact card sequence, add optional session notes, and generate the PDF when you are ready.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="action-chip" onClick={() => navigate('/select')}>
              Edit selection
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

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Session title
            <input
              type="text"
              value={sessionContext.sessionTitle}
              onChange={(event) => updateSessionContext({ sessionTitle: event.target.value })}
              className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
              placeholder="Therapy reflection session"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Facilitator
            <input
              type="text"
              value={sessionContext.facilitator}
              onChange={(event) => updateSessionContext({ facilitator: event.target.value })}
              className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
              placeholder="Practitioner name"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Client alias
            <input
              type="text"
              value={sessionContext.clientAlias}
              onChange={(event) => updateSessionContext({ clientAlias: event.target.value })}
              className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
              placeholder="Optional alias"
            />
          </label>
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm font-semibold text-slate-900">Privacy reminder</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              These notes stay in memory in this browser session. The backend receives them only when you generate the PDF and does not persist them.
            </p>
          </div>
          <label className="md:col-span-2 text-sm font-semibold text-slate-700">
            Session notes
            <textarea
              value={sessionContext.notes}
              onChange={(event) => updateSessionContext({ notes: event.target.value })}
              rows={5}
              className="mt-2 w-full rounded-[24px] border border-slate-300 px-4 py-3 text-sm"
              placeholder="Optional reflections, prompts, or debrief notes"
            />
          </label>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {selectedCardObjects.map((card, index) => (
            <article key={card.id} className="surface-muted flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Card #{card.id}</p>
              </div>
              <div className="overflow-hidden rounded-[20px] bg-slate-100">
                <img src={card.largeImage} alt={card.title} className="aspect-square w-full object-cover" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {getCardLabelNames(card.id).length ? getCardLabelNames(card.id).join(' • ') : 'No labels assigned yet'}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        <InsightCharts themeCoverage={themeCoverage} selectionOrder={selectionOrder} />
      </div>
    </div>
  );
}

