import { Link } from 'react-router-dom';


export function ConfigurationModuleCard({ title, description, accentClassName, iconLabel, to, actionLabel, onAction }) {
  const content = (
    <>
      <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${accentClassName}`}>
        <span className="text-xl font-bold">{iconLabel}</span>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <span className="mt-4 text-sm font-semibold text-brand-700">{actionLabel}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="surface-muted flex min-h-60 flex-col justify-between p-6 transition hover:-translate-y-1 hover:shadow-card">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onAction}
      className="surface-muted flex min-h-60 flex-col justify-between p-6 text-left transition hover:-translate-y-1 hover:shadow-card"
    >
      {content}
    </button>
  );
}
