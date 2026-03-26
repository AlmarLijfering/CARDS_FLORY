import { useEffect } from 'react';


export function CardPreviewModal({ card, title, closeLabel, selectedLabel, onClose }) {
  useEffect(() => {
    if (!card) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [card, onClose]);

  if (!card) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6" onClick={onClose}>
      <div
        className="surface relative w-full max-w-3xl overflow-hidden px-4 py-4 md:px-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{title}</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">#{card.id}</h3>
          </div>
          <button type="button" className="action-chip" onClick={onClose}>
            {closeLabel}
          </button>
        </div>

        <div className="mt-4 rounded-[28px] border border-slate-200 bg-slate-50 p-3 md:p-4">
          <div className="relative overflow-hidden rounded-[24px] bg-slate-100">
            <img src={card.largeImage} alt={card.title} className="max-h-[78vh] w-full object-contain" />
            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-700 shadow">
              #{card.id}
            </div>
            {selectedLabel ? (
              <div className="absolute bottom-3 left-3 rounded-full bg-brand-600 px-3 py-1 text-sm font-semibold text-white shadow">
                {selectedLabel}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
