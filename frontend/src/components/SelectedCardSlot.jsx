import { useDroppable } from '@dnd-kit/core';


export function EmptySelectionSlot({ index, labels }) {
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
      className={`ghost-grid flex min-h-[15rem] items-center justify-center rounded-[22px] border-2 border-dashed px-3 py-4 text-center transition ${
        isOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300/80 bg-white/50'
      }`}
      aria-label={`${labels.slotPrefix} ${index + 1}`}
    >
      <div>
        <p className="text-sm font-semibold text-slate-700">{labels.slotPrefix} {index + 1}</p>
        <p className="mt-1 text-[11px] text-slate-500">{labels.emptySlotHint}</p>
      </div>
    </div>
  );
}


export function SelectedCardSlot({
  card,
  index,
  labels,
  onOpenMenu,
  onRemove
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${index}`,
    data: {
      type: 'slot',
      index,
      cardId: card.id
    }
  });

  return (
    <article
      ref={setNodeRef}
      className={`surface-muted flex min-w-0 flex-col gap-2 p-2.5 transition ${
        isOver ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-canvas' : ''
      }`}
    >
      <div className="relative overflow-hidden rounded-[18px] bg-slate-100" onContextMenu={(event) => onOpenMenu(event, card)}>
        <img src={card.largeImage} alt={card.title} className="aspect-[4/5] w-full object-cover" />
        <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow">
          #{card.id}
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white">
          {index + 1}
        </div>
        <div className="absolute bottom-2 left-2 rounded-full bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white shadow">
          {labels.selected}
        </div>
      </div>
      <button
        type="button"
        className="min-h-9 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700"
        onClick={() => onRemove(card.id)}
        aria-label={`${labels.removeCard} ${card.id}`}
        title={labels.removeCard}
      >
        X
      </button>
    </article>
  );
}
