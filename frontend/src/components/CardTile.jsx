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

  return (
    <article role="gridcell" aria-selected={isActive} className="h-full">
      <button
        id={`catalog-card-${card.id}`}
        ref={setNodeRef}
        type="button"
        className={`card-button p-2 ${isActive ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-canvas' : ''}`}
        style={style}
        tabIndex={isActive ? 0 : -1}
        aria-disabled={isSelected}
        onFocus={() => onActivate(card.id)}
        onClick={() => onAdd(card.id, 'pointer')}
        onDoubleClick={() => onAdd(card.id, 'pointer')}
        onKeyDown={(event) => onKeyDown(event, card.id)}
        onContextMenu={(event) => onOpenMenu(event, card)}
        {...attributes}
        {...listeners}
      >
        <div className="relative overflow-hidden rounded-[18px] bg-slate-100">
          <img src={card.smallImage} alt={card.title} className="aspect-[4/5] w-full object-cover" loading="lazy" />
          <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow">
            #{card.id}
          </div>
          {isSelected ? (
            <div className="absolute bottom-2 left-2 rounded-full bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white shadow">
              {selectedLabel}
            </div>
          ) : null}
        </div>
      </button>
    </article>
  );
}
