import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { MAX_SELECTED_CARDS, SUPPORTED_LANGUAGES } from '../lib/constants';
import { useAppState } from '../lib/app-state';
import { CardTile } from './CardTile';
import { EmptyState } from './EmptyState';
import { EmptySelectionSlot, SelectedCardSlot } from './SelectedCardSlot';


function SelectedDropzone({ children, isOver, setNodeRef }) {
  return (
    <div
      ref={setNodeRef}
      className={`rounded-[28px] border border-slate-200 bg-white p-4 shadow-soft transition ${
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
    config,
    language,
    guidanceDismissed,
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

  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeCardId, setActiveCardId] = useState(() => cardCatalog[0]?.id ?? null);
  const [windowWidth, setWindowWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  const [activeDragCardId, setActiveDragCardId] = useState(null);

  const themeLabels = getThemeLabels(language);
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

  const filteredCards = cardCatalog.filter((card) => {
    const labelIds = getCardLabelIds(card.id);
    const multilingualLabels = labelIds.flatMap((labelId) =>
      SUPPORTED_LANGUAGES.map((currentLanguage) => config.themeLabels[currentLanguage][labelId - 1]),
    );
    const searchable = `${card.id} ${card.title} ${multilingualLabels.join(' ')}`.toLowerCase();
    const normalizedSearch = searchText.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
    const matchesFilter = activeFilter === 'all' || labelIds.includes(Number(activeFilter));
    return matchesSearch && matchesFilter;
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

  const gridColumns = windowWidth >= 1536 ? 5 : windowWidth >= 1280 ? 4 : windowWidth >= 768 ? 3 : 2;

  function clearFilters() {
    setSearchText('');
    setActiveFilter('all');
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
        title="Select Cards is blocked"
        description="This route is disabled in local configuration, so the session workspace will not open until it is unblocked."
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
      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="surface px-5 py-6 md:px-6 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Selection</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Your session tray</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                Choose between 1 and 6 cards. Click, press Enter, or drag cards into the tray. Reorder with drag or the move buttons.
              </p>
            </div>
            <span className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
              {selectedCards.length}/{MAX_SELECTED_CARDS} selected
            </span>
          </div>

          {!guidanceDismissed ? (
            <div className="mt-5 rounded-3xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  The gallery is a single-tab-stop picker. Use arrow keys to browse, then press Enter or Space to add a card.
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
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
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
              onClick={() => navigate('/overview')}
            >
              Review selection
            </button>
            <button type="button" className="action-chip" disabled={!selectedCards.length} onClick={clearSelection}>
              Clear selection
            </button>
          </div>
        </section>

        <section className="surface px-5 py-6 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Available Cards</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Composite picker</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Filter by theme, search by card number or label, then add cards to the session tray.
              </p>
            </div>
            <Link to="/overview" className="action-chip">
              Overview
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Search cards
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Card number or label"
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Filter cards by label">
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
            <p className="text-sm text-slate-500">{filteredCards.length} cards shown</p>
          </div>

          {filteredCards.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No cards match this filter."
                description="Clear the search or switch labels to keep going."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            </div>
          ) : (
            <div
              className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
              role="grid"
              aria-label="Available cards"
            >
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
          )}
        </section>
      </div>

      <DragOverlay>
        {activeDragCardId ? (
          <div className="w-44 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-card">
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
