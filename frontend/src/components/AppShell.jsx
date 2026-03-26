import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { LANGUAGE_LABELS } from '../lib/constants';
import { useAppState } from '../lib/app-state';


function navClassName(isActive) {
  return isActive
    ? 'rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white'
    : 'rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900';
}


export function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { finalizePath, isAuthenticated, language, logout, sessionPath, setLanguage } = useAppState();
  const isConfigurationRoute = location.pathname.startsWith('/configuration');
  const isSessionRoute = location.pathname.startsWith('/session');
  const showSessionNavigation = isSessionRoute;
  const showConfigurationNavigation = isConfigurationRoute && isAuthenticated;

  return (
    <div className="min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="surface px-4 py-3 md:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col justify-center">
              <p className="eyebrow">Therapy Cards</p>
              <h1 className="font-display text-xl font-semibold text-slate-900">Reflection Workspace</h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {showSessionNavigation || showConfigurationNavigation ? (
                <nav className="flex flex-wrap gap-2">
                  {showSessionNavigation ? (
                    <>
                      <NavLink to={sessionPath} end className={({ isActive }) => navClassName(isActive)}>
                        Session
                      </NavLink>
                      <NavLink to={finalizePath} end className={({ isActive }) => navClassName(isActive)}>
                        Finalize Session
                      </NavLink>
                    </>
                  ) : null}
                  {showConfigurationNavigation ? (
                    <NavLink to="/configuration" end className={({ isActive }) => navClassName(isActive)}>
                      Configuration
                    </NavLink>
                  ) : null}
                </nav>
              ) : null}
              <label className="flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                <span>Language</span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="bg-transparent text-sm outline-none"
                >
                  {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {isAuthenticated ? (
                <button
                  type="button"
                  className="action-chip"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  Log out
                </button>
              ) : null}
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
