import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { rectSortingStrategy, sortableKeyboardCoordinates, SortableContext } from '@dnd-kit/sortable';

import { cardCatalog } from '../data/cardCatalog';
import { MAX_SELECTED_CARDS } from '../lib/constants';
import { useAppState } from '../lib/app-state';
import { CardTile } from './CardTile';
import { EmptyState } from './EmptyState';
import { EmptySelectionSlot, SelectedCardSlot } from './SelectedCardSlot';


function SelectedDropzone({ children, isOver, setNodeRef }) {
  return (
    <div
      ref={setNodeRef}
      className={`rounded-[28px] border border-slate-200 bg-white p-3 shadow-soft transition ${
        isOver ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-canvas' : ''
      }`}
    >
      {children}
    </div>
  );
}


export function SelectCardsPage() {
  const navigate = useNavigate();
  const {
    activeSessionKey,
    config,
    finalizePath,
    guidanceDismissed,
    sessionPath,
    setGuidanceDismissed,
    selectedCards,
    addSelectedCard,
    removeSelectedCard,
    reorderSelectedCards,
    clearSelection,
    getThemeLabels,
    getCardLabelIds,
    getCardLabelNames
  } = useAppState();

  const [activeFilter, setActiveFilter] = useState('all');
  const [activeCardId, setActiveCardId] = useState(() => cardCatalog[0]?.id ?? null);
  const [windowWidth, setWindowWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  const [activeDragCardId, setActiveDragCardId] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const themeLabels = getThemeLabels();
  const selectedCardSet = new Set(selectedCards);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const { isOver: selectionBoardOver, setNodeRef: setSelectionBoardRef } = useDroppable({
    id: 'selected-dropzone',
    data: {
      type: 'selected-dropzone'
    }
  });

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filterChips = [
    { id: 'all', label: `All (${cardCatalog.length})` },
    ...themeLabels
      .map((label, index) => {
        const labelId = index + 1;
        const count = cardCatalog.filter((card) => getCardLabelIds(card.id).includes(labelId)).length;
        if (!count) {
          return null;
        }
        return {
          id: String(labelId),
          label: `${label} (${count})`
        };
      })
      .filter(Boolean)
  ];

  useEffect(() => {
    if (activeFilter !== 'all' && !filterChips.some((chip) => chip.id === activeFilter)) {
      setActiveFilter('all');
    }
  }, [activeFilter, filterChips]);

  const filteredCards = cardCatalog.filter((card) => {
    const labelIds = getCardLabelIds(card.id);
    return activeFilter === 'all' || labelIds.includes(Number(activeFilter));
  });

  useEffect(() => {
    if (!filteredCards.length) {
      setActiveCardId(null);
      return;
    }

    if (!filteredCards.some((card) => card.id === activeCardId)) {
      setActiveCardId(filteredCards[0].id);
    }
  }, [activeCardId, filteredCards]);

  const selectedCardObjects = selectedCards
    .map((cardId) => cardCatalog.find((card) => card.id === cardId))
    .filter(Boolean);

  const gridColumns = windowWidth >= 1536 ? 6 : windowWidth >= 1280 ? 5 : windowWidth >= 1024 ? 4 : windowWidth >= 768 ? 3 : 2;
  const shareableSessionUrl = typeof window === 'undefined' ? sessionPath : `${window.location.origin}${sessionPath}`;

  async function copySessionLink() {
    try {
      await navigator.clipboard.writeText(shareableSessionUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1800);
    } catch (error) {
      setLinkCopied(false);
    }
  }

  function handleAddCard(cardId, preferredIndex = selectedCards.length) {
    if (selectedCardSet.has(cardId) || selectedCards.length >= MAX_SELECTED_CARDS) {
      return;
    }
    addSelectedCard(cardId, preferredIndex);
  }

  function handleTileKeyDown(event, cardId) {
    if (!filteredCards.length) {
      return;
    }

    const currentIndex = filteredCards.findIndex((card) => card.id === cardId);
    if (currentIndex === -1) {
      return;
    }

    let nextIndex = currentIndex;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = Math.min(filteredCards.length - 1, currentIndex + 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(filteredCards.length - 1, currentIndex + gridColumns);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(0, currentIndex - gridColumns);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = filteredCards.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleAddCard(cardId);
        return;
      default:
        return;
    }

    event.preventDefault();
    const nextCard = filteredCards[nextIndex];
    if (!nextCard) {
      return;
    }
    setActiveCardId(nextCard.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`catalog-card-${nextCard.id}`)?.focus();
    });
  }

  function handleDragStart(event) {
    const cardId = event.active.data.current?.cardId;
    setActiveDragCardId(cardId ?? null);
  }

  function handleDragCancel() {
    setActiveDragCardId(null);
  }

  function handleDragEnd(event) {
    setActiveDragCardId(null);
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData?.cardId) {
      return;
    }

    if (activeData.source === 'catalog') {
      if (selectedCardSet.has(activeData.cardId) || selectedCards.length >= MAX_SELECTED_CARDS) {
        return;
      }

      if (overData?.type === 'slot') {
        handleAddCard(activeData.cardId, overData.index);
        return;
      }

      if (overData?.source === 'selected') {
        const overIndex = selectedCards.indexOf(overData.cardId);
        handleAddCard(activeData.cardId, overIndex === -1 ? selectedCards.length : overIndex);
        return;
      }

      handleAddCard(activeData.cardId, selectedCards.length);
      return;
    }

    if (activeData.source === 'selected') {
      const fromIndex = selectedCards.indexOf(activeData.cardId);
      if (fromIndex === -1) {
        return;
      }

      if (overData?.type === 'slot') {
        const toIndex = Math.min(overData.index, selectedCards.length - 1);
        reorderSelectedCards(fromIndex, toIndex);
        return;
      }

      if (overData?.source === 'selected') {
        const toIndex = selectedCards.indexOf(overData.cardId);
        if (toIndex !== -1) {
          reorderSelectedCards(fromIndex, toIndex);
        }
      }
    }
  }

  if (config.selectCardsBlocked) {
    return (
      <EmptyState
        title="Session is blocked"
        description="This direct session link is disabled in local configuration, so the session workspace will not open until it is unblocked."
        actionLabel="Open configuration"
        onAction={() => navigate('/configuration')}
        tone="warning"
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <section className="surface px-5 py-6 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="eyebrow">Session</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Select up to six cards.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                This session can be opened directly with its own link, and its card selection stays isolated by URL in this browser tab.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate-600">
              <span className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700">
                {activeSessionKey === 'default' ? 'Default session' : `Session: ${activeSessionKey}`}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="action-chip" onClick={copySessionLink}>
                  {linkCopied ? 'Link copied' : 'Copy session link'}
                </button>
                <button
                  type="button"
                  className="action-chip action-chip-active"
                  disabled={!selectedCards.length}
                  onClick={() => navigate(finalizePath)}
                >
                  Finalize Session
                </button>
              </div>
            </div>
          </div>

          {!guidanceDismissed ? (
            <div className="mt-5 rounded-3xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  The six selected cards stay in the top tray. Use the filter buttons below and click or drag cards into place.
                </p>
                <button type="button" className="text-sm font-semibold underline underline-offset-4" onClick={() => setGuidanceDismissed(true)}>
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <SelectedDropzone isOver={selectionBoardOver} setNodeRef={setSelectionBoardRef}>
              <SortableContext items={selectedCardObjects.map((card) => `selected-${card.id}`)} strategy={rectSortingStrategy}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                  {Array.from({ length: MAX_SELECTED_CARDS }, (_, index) => {
                    const card = selectedCardObjects[index];
                    if (!card) {
                      return <EmptySelectionSlot key={`slot-${index}`} index={index} />;
                    }

                    return (
                      <SelectedCardSlot
                        key={card.id}
                        card={card}
                        index={index}
                        totalSelected={selectedCardObjects.length}
                        labelNames={getCardLabelNames(card.id)}
                        onMove={(fromIndex, toIndex) => reorderSelectedCards(fromIndex, toIndex)}
                        onRemove={removeSelectedCard}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </SelectedDropzone>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="action-chip action-chip-active"
              disabled={!selectedCards.length}
              onClick={() => navigate(finalizePath)}
            >
              Finalize Session
            </button>
            <button type="button" className="action-chip" disabled={!selectedCards.length} onClick={clearSelection}>
              Clear session
            </button>
          </div>
        </section>

        <section className="surface px-5 py-6 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="eyebrow">Available Cards</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Choose by label buttons.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Search has been removed. Use the label buttons to switch card groups, then click or drag cards into the top row.
              </p>
            </div>
            <span className="text-sm text-slate-500">{filteredCards.length} cards shown</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2" role="toolbar" aria-label="Filter cards by label">
            {filterChips.map((chip) => {
              const isActive = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={`action-chip ${isActive ? 'action-chip-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => setActiveFilter(chip.id)}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                labelNames={getCardLabelNames(card.id)}
                isActive={card.id === activeCardId}
                isSelected={selectedCardSet.has(card.id)}
                onActivate={setActiveCardId}
                onAdd={handleAddCard}
                onKeyDown={handleTileKeyDown}
              />
            ))}
          </div>
        </section>
      </div>

      <DragOverlay>
        {activeDragCardId ? (
          <div className="w-40 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-card">
            <img
              src={cardCatalog.find((card) => card.id === activeDragCardId)?.smallImage}
              alt={`Card ${activeDragCardId}`}
              className="aspect-square w-full rounded-[18px] object-cover"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
