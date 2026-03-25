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
      className={`ghost-grid flex min-h-28 items-center justify-center rounded-[20px] border-2 border-dashed px-2 py-3 text-center transition ${
        isOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300/80 bg-white/50'
      }`}
      aria-label={`Selection slot ${index + 1} is empty`}
    >
      <div>
        <p className="text-sm font-semibold text-slate-700">Slot {index + 1}</p>
        <p className="mt-1 text-[11px] text-slate-500">Drop or click to fill</p>
      </div>
    </div>
  );
}


export function SelectedCardSlot({ card, index, totalSelected, onMove, onRemove }) {
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
    <article ref={setNodeRef} style={style} className="surface-muted flex min-w-0 flex-col gap-2 p-2.5">
      <div className="relative overflow-hidden rounded-[18px] bg-slate-100">
        <img src={card.largeImage} alt={card.title} className="aspect-[4/5] w-full object-cover" />
        <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow">
          #{card.id}
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white">
          {index + 1}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1">
        <button
          type="button"
          className="min-h-8 rounded-2xl border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
        >
          {'<'}
        </button>
        <button
          type="button"
          className="min-h-8 rounded-2xl border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onMove(index, index + 1)}
          disabled={index >= totalSelected - 1}
        >
          {'>'}
        </button>
        <button
          type="button"
          className="min-h-8 rounded-2xl border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700"
          aria-label={`Drag card ${card.id}`}
          {...attributes}
          {...listeners}
        >
          ||
        </button>
        <button
          type="button"
          className="min-h-8 rounded-2xl border border-rose-200 bg-rose-50 px-2 text-[11px] font-semibold text-rose-700"
          onClick={() => onRemove(card.id)}
        >
          X
        </button>
      </div>
    </article>
  );
}
