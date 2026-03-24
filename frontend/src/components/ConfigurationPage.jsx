import { Link } from 'react-router-dom';

import { useAppState } from '../lib/app-state';


export function ConfigurationPage() {
  const { config, setSelectCardsBlocked } = useAppState();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="surface px-6 py-8 md:px-8 md:py-10">
        <p className="eyebrow">Configuration</p>
        <h2 className="page-title mt-3">Control the workspace.</h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
          These settings live in the browser on this device. They affect the current frontend app,
          including direct navigation inside the SPA.
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

