export function EmptyState({ title, description, actionLabel, onAction, tone = 'neutral' }) {
  const toneClassName =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`surface-muted flex flex-col items-start gap-3 border px-5 py-5 ${toneClassName}`}>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 max-w-xl text-sm text-slate-600">{description}</p>
      </div>
      {actionLabel ? (
        <button type="button" className="action-chip" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

