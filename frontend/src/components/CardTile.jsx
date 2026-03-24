import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';


export function CardTile({
  card,
  labelNames,
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
        className={`card-button ${isActive ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-canvas' : ''}`}
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
          {isSelected ? (
            <div className="absolute right-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
              Selected
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {labelNames.length ? labelNames.join(' • ') : 'No labels assigned yet'}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Drag
          </span>
        </div>
      </button>
    </article>
  );
}

