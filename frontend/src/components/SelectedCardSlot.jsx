import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


export function EmptySelectionSlot({ index }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${index}`,
    data: {
      type: 'slot',
      index
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`ghost-grid flex min-h-40 items-center justify-center rounded-[24px] border-2 border-dashed px-4 py-6 text-center transition ${
        isOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300/80 bg-white/50'
      }`}
      aria-label={`Selection slot ${index + 1} is empty`}
    >
      <div>
        <p className="text-sm font-semibold text-slate-700">Slot {index + 1}</p>
        <p className="mt-1 text-xs text-slate-500">Drop a card here or use Enter on the gallery.</p>
      </div>
    </div>
  );
}


export function SelectedCardSlot({ card, index, totalSelected, labelNames, onMove, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `selected-${card.id}`,
    data: {
      source: 'selected',
      cardId: card.id
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <article ref={setNodeRef} style={style} className="surface-muted flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
            {index + 1}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
            <p className="text-xs text-slate-500">Card #{card.id}</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
          aria-label={`Drag card ${card.id}`}
          {...attributes}
          {...listeners}
        >
          Drag
        </button>
      </div>
      <div className="overflow-hidden rounded-[20px] bg-slate-100">
        <img src={card.largeImage} alt={card.title} className="aspect-square w-full object-cover" />
      </div>
      <p className="text-xs text-slate-500">{labelNames.length ? labelNames.join(' • ') : 'No labels assigned yet'}</p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className="min-h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
        >
          Earlier
        </button>
        <button
          type="button"
          className="min-h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onMove(index, index + 1)}
          disabled={index >= totalSelected - 1}
        >
          Later
        </button>
        <button
          type="button"
          className="min-h-11 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700"
          onClick={() => onRemove(card.id)}
        >
          Remove
        </button>
      </div>
    </article>
  );
}
