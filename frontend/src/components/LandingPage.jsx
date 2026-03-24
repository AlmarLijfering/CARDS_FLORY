import { Link, useNavigate } from 'react-router-dom';

import { EmptyState } from './EmptyState';
import { useAppState } from '../lib/app-state';


export function LandingPage() {
  const navigate = useNavigate();
  const { config } = useAppState();

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="surface px-6 py-8 md:px-8 md:py-10">
        <p className="eyebrow">Session Flow</p>
        <h2 className="page-title mt-3">Choose where you want to work.</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          The new stack keeps therapy-session data in the browser only. Theme labels and card-label
          configuration stay local to the device, and the backend is used only to render the final PDF
          in memory.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            to="/select"
            className={`surface-muted group flex min-h-56 flex-col justify-between p-6 transition ${
              config.selectCardsBlocked ? 'pointer-events-none opacity-60' : 'hover:-translate-y-1 hover:shadow-card'
            }`}
          >
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
              <span className="text-xl font-bold">01</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Open Select Cards</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Build a live selection of up to six cards with click, keyboard, or drag-and-drop.
              </p>
            </div>
            <span className="mt-4 text-sm font-semibold text-brand-700">
              {config.selectCardsBlocked ? 'Blocked in configuration' : 'Start a session'}
            </span>
          </Link>
          <Link
            to="/configuration"
            className="surface-muted group flex min-h-56 flex-col justify-between p-6 transition hover:-translate-y-1 hover:shadow-card"
          >
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
              <span className="text-xl font-bold">02</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Open Configuration</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Adjust theme names, assign labels to cards, and decide whether the session route should
                be blocked.
              </p>
            </div>
            <span className="mt-4 text-sm font-semibold text-accent-700">Configure workspace</span>
          </Link>
        </div>
      </section>
      <section className="surface px-6 py-8 md:px-8 md:py-10">
        <p className="eyebrow">Privacy</p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">Built for sensitive sessions.</h2>
        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
          <p>The browser owns the active session. Nothing about the selected cards is stored in a server database.</p>
          <p>
            When you choose <strong>Print to PDF</strong>, the frontend sends only the final payload to FastAPI,
            which streams the PDF back immediately and discards the data.
          </p>
        </div>
        {config.selectCardsBlocked ? (
          <div className="mt-8">
            <EmptyState
              title="Session workspace is blocked"
              description="The select-cards route is currently disabled in local configuration, including direct in-app navigation."
              actionLabel="Open configuration"
              onAction={() => navigate('/configuration')}
              tone="warning"
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
