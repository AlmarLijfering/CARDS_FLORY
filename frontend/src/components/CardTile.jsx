import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';


export function CardTile({
  card,
  isActive,
  isSelected,
  selectedLabel,
  onActivate,
  onAdd,
  onOpenMenu,
  onKeyDown
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `catalog-${card.id}`,
    data: {
      source: 'catalog',
      cardId: card.id
    },
    disabled: isSelected
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1
  };
  const { onKeyDown: ignoredKeyDown, tabIndex: ignoredTabIndex, role: ignoredRole, ...dragAttributes } = attributes ?? {};
  const { onKeyDown: ignoredDragKeyDown, ...dragListeners } = listeners ?? {};

  return (
    <article role="gridcell" aria-selected={isActive} className="h-full">
      <button
        id={`catalog-card-${card.id}`}
        ref={setNodeRef}
        type="button"
        data-card-id={card.id}
        data-selected={isSelected ? 'true' : 'false'}
        className={`card-button relative aspect-square p-1.5 hover:translate-y-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${
          isActive ? 'z-10 border-brand-500 ring-2 ring-brand-500/45 ring-offset-0' : ''
        } ${
          isSelected ? 'bg-slate-100/90' : ''
        }`}
        style={style}
        tabIndex={isActive ? 0 : -1}
        aria-disabled={isSelected}
        aria-pressed={isSelected}
        onFocus={() => onActivate(card.id)}
        onClick={() => onActivate(card.id)}
        onDoubleClick={() => onAdd(card.id, 'pointer')}
        onKeyDown={(event) => onKeyDown(event, card.id)}
        onContextMenu={(event) => onOpenMenu(event, card)}
        {...dragAttributes}
        {...dragListeners}
      >
        <div className="relative h-full overflow-hidden rounded-[18px] bg-slate-100">
          <img
            src={card.smallImage}
            alt={card.title}
            className={`aspect-square h-full w-full object-cover transition ${
              isSelected ? 'opacity-60 saturate-50' : ''
            }`}
            loading="lazy"
          />
          <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow">
            #{card.id}
          </div>
          {isSelected ? (
            <>
              <div className="pointer-events-none absolute inset-0 bg-slate-100/30" />
              <div className="absolute bottom-2 left-2 rounded-full bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white shadow">
                {selectedLabel}
              </div>
            </>
          ) : null}
        </div>
      </button>
    </article>
  );
}
