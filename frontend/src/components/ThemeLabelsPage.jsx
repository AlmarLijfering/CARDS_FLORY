import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../lib/constants';
import { useAppState } from '../lib/app-state';


function cloneLabels(labels) {
  return {
    en: [...labels.en],
    nl: [...labels.nl],
    ro: [...labels.ro]
  };
}


export function ThemeLabelsPage() {
  const { config, setThemeLabels } = useAppState();
  const [draftLabels, setDraftLabels] = useState(() => cloneLabels(config.themeLabels));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraftLabels(cloneLabels(config.themeLabels));
  }, [config.themeLabels]);

  function updateLabel(language, index, value) {
    setSaved(false);
    setDraftLabels((current) => {
      const next = cloneLabels(current);
      next[language][index] = value;
      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    setThemeLabels(draftLabels);
    setSaved(true);
  }

  return (
    <section className="surface px-6 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2 className="page-title mt-3">Theme labels</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            These labels drive the filter chips in the session workspace and the theme names shown in the PDF.
          </p>
        </div>
        <Link to="/configuration" className="action-chip">
          Back to configuration
        </Link>
      </div>

      {saved ? (
        <div className="mt-6 rounded-3xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
          Theme labels saved locally for this browser.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="overflow-hidden rounded-[28px] border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 bg-white">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Slot</th>
                {SUPPORTED_LANGUAGES.map((language) => (
                  <th key={language} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {LANGUAGE_LABELS[language]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Array.from({ length: 6 }, (_, index) => (
                <tr key={index}>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-900">Label {index + 1}</td>
                  {SUPPORTED_LANGUAGES.map((language) => (
                    <td key={language} className="px-4 py-4">
                      <input
                        type="text"
                        maxLength={50}
                        className="min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
                        value={draftLabels[language][index]}
                        onChange={(event) => updateLabel(language, index, event.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="action-chip action-chip-active">
            Save labels
          </button>
          <Link to="/configuration/card-labels" className="action-chip">
            Open card labels
          </Link>
        </div>
      </form>
    </section>
  );
}

