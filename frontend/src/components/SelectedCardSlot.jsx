import { useDroppable } from '@dnd-kit/core';


export function EmptySelectionSlot({ index, labels, isActive, onActivate, onKeyDown }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${index}`,
    data: {
      type: 'slot',
      index
    }
  });

  return (
    <div
      id={`selected-slot-${index}`}
      ref={setNodeRef}
      role="button"
      tabIndex={isActive ? 0 : -1}
      onFocus={onActivate}
      onClick={onActivate}
      onKeyDown={(event) => onKeyDown(event, index, false)}
      className={`ghost-grid flex aspect-square items-center justify-center rounded-[22px] border-2 border-dashed px-3 py-4 text-center transition focus-visible:ring-0 focus-visible:ring-offset-0 ${
        isOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300/80 bg-white/50'
      } ${
        isActive ? 'ring-2 ring-inset ring-brand-500' : ''
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
  removeLabel,
  isActive,
  onActivate,
  onKeyDown,
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
      id={`selected-slot-${index}`}
      ref={setNodeRef}
      role="button"
      tabIndex={isActive ? 0 : -1}
      onFocus={onActivate}
      onClick={onActivate}
      onKeyDown={(event) => onKeyDown(event, index, true, card.id)}
      className={`surface-muted flex min-w-0 flex-col p-1.5 transition focus-visible:ring-0 focus-visible:ring-offset-0 ${
        isOver ? 'ring-2 ring-inset ring-brand-500 ring-offset-0' : ''
      } ${
        isActive ? 'ring-2 ring-inset ring-brand-500 ring-offset-0' : ''
      }`}
    >
      <div className="relative overflow-hidden rounded-[18px] bg-slate-100" onContextMenu={(event) => onOpenMenu(event, card)}>
        <img src={card.largeImage} alt={card.title} className="aspect-square w-full object-cover opacity-80 saturate-50" />
        <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow">
          #{card.id}
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white">
          {index + 1}
        </div>
        <button
          type="button"
          className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 shadow"
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            onRemove(card.id);
          }}
          aria-label={`${removeLabel} ${card.id}`}
          title={removeLabel}
        >
          X
        </button>
      </div>
    </article>
  );
}
