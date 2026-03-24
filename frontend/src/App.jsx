import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppStateProvider } from './lib/app-state';
import { AppShell } from './components/AppShell';

const LandingPage = lazy(() => import('./components/LandingPage').then((module) => ({ default: module.LandingPage })));
const ConfigurationPage = lazy(() =>
  import('./components/ConfigurationPage').then((module) => ({ default: module.ConfigurationPage })),
);
const ThemeLabelsPage = lazy(() =>
  import('./components/ThemeLabelsPage').then((module) => ({ default: module.ThemeLabelsPage })),
);
const CardLabelsPage = lazy(() =>
  import('./components/CardLabelsPage').then((module) => ({ default: module.CardLabelsPage })),
);
const SelectCardsPage = lazy(() =>
  import('./components/SelectCardsPage').then((module) => ({ default: module.SelectCardsPage })),
);
const OverviewPage = lazy(() =>
  import('./components/OverviewPage').then((module) => ({ default: module.OverviewPage })),
);


export default function App() {
  return (
    <BrowserRouter>
      <AppStateProvider>
        <AppShell>
          <Suspense
            fallback={
              <div className="surface px-6 py-8 text-sm font-semibold text-slate-600">
                Loading workspace...
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/configuration" element={<ConfigurationPage />} />
              <Route path="/configuration/themes" element={<ThemeLabelsPage />} />
              <Route path="/configuration/card-labels" element={<CardLabelsPage />} />
              <Route path="/select" element={<SelectCardsPage />} />
              <Route path="/overview" element={<OverviewPage />} />
            </Routes>
          </Suspense>
        </AppShell>
      </AppStateProvider>
    </BrowserRouter>
  );
}
