import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { cardCatalog } from '../data/cardCatalog';
import { EmptyState } from './EmptyState';
import { useAppState } from '../lib/app-state';


function cloneAssignments(assignments) {
  const next = {};
  Object.entries(assignments).forEach(([cardId, labels]) => {
    next[cardId] = [...labels];
  });
  return next;
}


export function CardLabelsPage() {
  const { config, configError, importBundle, isConfigLoading, setCardLabels } = useAppState();
  const themeLabels = config.themeLabels.en;
  const [draftAssignments, setDraftAssignments] = useState(() => cloneAssignments(config.cardLabels));
  const [searchText, setSearchText] = useState('');
  const [labelFilter, setLabelFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setDraftAssignments(cloneAssignments(config.cardLabels));
  }, [config.cardLabels]);

  const visibleCards = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return cardCatalog.filter((card) => {
      const labels = draftAssignments[String(card.id)] || [];
      const labelNames = labels.map((labelId) => themeLabels[labelId - 1]).filter(Boolean);
      const searchable = `${card.id} ${card.title} ${labelNames.join(' ')}`.toLowerCase();

      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesLabel = labelFilter === 'all' || labels.includes(Number(labelFilter));
      const matchesAssignment =
        assignmentFilter === 'all'
          ? true
          : assignmentFilter === 'assigned'
            ? labels.length > 0
            : labels.length === 0;

      return matchesSearch && matchesLabel && matchesAssignment;
    });
  }, [assignmentFilter, draftAssignments, labelFilter, searchText, themeLabels]);

  function toggleCardLabel(cardId, labelId) {
    setStatusMessage('');
    setDraftAssignments((current) => {
      const next = cloneAssignments(current);
      const key = String(cardId);
      const labels = next[key] || [];
      if (labels.includes(labelId)) {
        next[key] = labels.filter((value) => value !== labelId);
        if (!next[key].length) {
          delete next[key];
        }
      } else {
        next[key] = [...labels, labelId].sort((left, right) => left - right);
      }
      return next;
    });
  }

  async function handleSave() {
    setIsSaving(true);
    setStatusMessage('');

    try {
      await setCardLabels(draftAssignments);
      setStatusMessage('Card label assignments saved.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to save card label assignments.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const outcome = await importBundle(result);
      if (outcome.ok) {
        setStatusMessage('Label bundle imported successfully.');
      } else {
        setStatusMessage(outcome.error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function clearFilters() {
    setSearchText('');
    setLabelFilter('all');
    setAssignmentFilter('all');
  }

  if (isConfigLoading) {
    return <section className="surface px-6 py-8 text-sm font-semibold text-slate-600">Loading card labels...</section>;
  }

  if (configError) {
    return (
      <EmptyState
        title="Card labels unavailable"
        description={configError}
        tone="warning"
      />
    );
  }

  return (
    <section className="surface px-6 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2 className="page-title mt-3">Card labels</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Assign one or more of the six shared theme labels to each card. This screen stays in English so the admin workflow remains compact.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/configuration" className="action-chip">
            Back to configuration
          </Link>
          <Link to="/configuration/themes" className="action-chip">
            Edit theme labels
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
        <label className="text-sm font-semibold text-slate-700">
          Search cards
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Card number or label"
            className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Filter by label
          <select
            value={labelFilter}
            onChange={(event) => setLabelFilter(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
          >
            <option value="all">All labels</option>
            {themeLabels.map((label, index) => (
              <option key={label} value={index + 1}>
                {index + 1} - {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Assignment state
          <select
            value={assignmentFilter}
            onChange={(event) => setAssignmentFilter(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
          >
            <option value="all">All cards</option>
            <option value="assigned">Assigned cards</option>
            <option value="unassigned">Unassigned cards</option>
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <button type="button" className="action-chip" onClick={() => fileInputRef.current?.click()}>
            Import configuration
          </button>
          <input ref={fileInputRef} type="file" className="hidden" accept="application/json,.json" onChange={handleImport} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{visibleCards.length} cards visible</p>
        <button type="button" className="action-chip action-chip-active" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save assignments'}
        </button>
      </div>

      {statusMessage ? (
        <div className="mt-4 rounded-3xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
          {statusMessage}
        </div>
      ) : null}

      {visibleCards.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No cards match this filter."
            description="Clear the search or change the filters to keep editing assignments."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
          <div className="max-h-[68vh] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Card</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Labels</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleCards.map((card) => {
                  const assignedLabels = draftAssignments[String(card.id)] || [];
                  return (
                    <tr key={card.id}>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">#{card.id}</td>
                      <td className="px-4 py-4">
                        <img src={card.smallImage} alt={card.title} className="h-20 w-20 rounded-2xl object-cover shadow-sm" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {themeLabels.map((label, index) => {
                            const labelId = index + 1;
                            const isChecked = assignedLabels.includes(labelId);
                            return (
                              <label
                                key={`${card.id}-${labelId}`}
                                className={`flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2 text-sm ${
                                  isChecked ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                                  checked={isChecked}
                                  onChange={() => toggleCardLabel(card.id, labelId)}
                                />
                                <span>
                                  {labelId} - {label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
