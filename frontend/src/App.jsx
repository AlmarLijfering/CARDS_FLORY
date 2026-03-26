import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AppStateProvider } from './lib/app-state';
import { useAppState } from './lib/app-state';
import { AppShell } from './components/AppShell';

const LandingPage = lazy(() => import('./components/LandingPage').then((module) => ({ default: module.LandingPage })));
const ConfigurationPage = lazy(() =>
  import('./components/ConfigurationPage').then((module) => ({ default: module.ConfigurationPage })),
);
const WorkspaceSettingsPage = lazy(() =>
  import('./components/WorkspaceSettingsPage').then((module) => ({ default: module.WorkspaceSettingsPage })),
);
const SessionManagementPage = lazy(() =>
  import('./components/SessionManagementPage').then((module) => ({ default: module.SessionManagementPage })),
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
const SessionInvitePage = lazy(() =>
  import('./components/SessionInvitePage').then((module) => ({ default: module.SessionInvitePage })),
);


function ProtectedConfigurationRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isAuthLoading } = useAppState();

  if (isAuthLoading) {
    return (
      <div className="surface px-6 py-8 text-sm font-semibold text-slate-600">
        Checking admin access...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}


export default function App() {
  return (
    <HashRouter>
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
              <Route
                path="/configuration"
                element={
                  <ProtectedConfigurationRoute>
                    <ConfigurationPage />
                  </ProtectedConfigurationRoute>
                }
              />
              <Route
                path="/configuration/workspace"
                element={
                  <ProtectedConfigurationRoute>
                    <WorkspaceSettingsPage />
                  </ProtectedConfigurationRoute>
                }
              />
              <Route
                path="/configuration/sessions"
                element={
                  <ProtectedConfigurationRoute>
                    <SessionManagementPage />
                  </ProtectedConfigurationRoute>
                }
              />
              <Route
                path="/configuration/themes"
                element={
                  <ProtectedConfigurationRoute>
                    <ThemeLabelsPage />
                  </ProtectedConfigurationRoute>
                }
              />
              <Route
                path="/configuration/card-labels"
                element={
                  <ProtectedConfigurationRoute>
                    <CardLabelsPage />
                  </ProtectedConfigurationRoute>
                }
              />
              <Route path="/session" element={<SelectCardsPage />} />
              <Route path="/session/finalize" element={<OverviewPage />} />
              <Route path="/session/:sessionKey" element={<SelectCardsPage />} />
              <Route path="/session/:sessionKey/finalize" element={<OverviewPage />} />
              <Route path="/invite/:accessToken" element={<SessionInvitePage />} />
              <Route path="/select" element={<Navigate to="/session" replace />} />
              <Route path="/overview" element={<Navigate to="/session/finalize" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppShell>
      </AppStateProvider>
    </HashRouter>
  );
}
