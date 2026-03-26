import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';


export function CardTile({
  card,
  isActive,
  isSelected,
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
        className={`card-button p-1.5 hover:translate-y-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${isActive ? 'ring-2 ring-inset ring-brand-500 ring-offset-0' : ''}`}
        style={style}
        tabIndex={isActive ? 0 : -1}
        aria-disabled={isSelected}
        onFocus={() => onActivate(card.id)}
        onClick={() => onActivate(card.id)}
        onDoubleClick={() => onAdd(card.id, 'pointer')}
        onKeyDown={(event) => onKeyDown(event, card.id)}
        onContextMenu={(event) => onOpenMenu(event, card)}
        {...attributes}
        {...listeners}
      >
        <div className="relative overflow-hidden rounded-[16px] bg-slate-100">
          <img src={card.smallImage} alt={card.title} className="aspect-[4/5] w-full object-cover" loading="lazy" />
          <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow">
            #{card.id}
          </div>
        </div>
      </button>
    </article>
  );
}
