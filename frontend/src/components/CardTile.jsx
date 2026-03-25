import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';


export function CardTile({
  card,
  isActive,
  isSelected,
  onActivate,
  onAdd,
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
        className={`card-button p-2.5 ${isActive ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-canvas' : ''}`}
        style={style}
        tabIndex={isActive ? 0 : -1}
        aria-disabled={isSelected}
        onFocus={() => onActivate(card.id)}
        onClick={() => onAdd(card.id)}
        onDoubleClick={() => onAdd(card.id)}
        onKeyDown={(event) => onKeyDown(event, card.id)}
        {...attributes}
        {...listeners}
      >
        <div className="relative overflow-hidden rounded-[18px] bg-slate-100">
          <img src={card.smallImage} alt={card.title} className="aspect-square w-full object-cover" loading="lazy" />
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700 shadow">
            #{card.id}
          </div>
          {isSelected ? <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-brand-600 ring-2 ring-white" /> : null}
        </div>
      </button>
    </article>
  );
}
