import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core';

import { cardCatalog } from '../data/cardCatalog';
import { MAX_SELECTED_CARDS } from '../lib/constants';
import { useAppState } from '../lib/app-state';
import { useSessionAccessGuard } from '../hooks/useSessionAccessGuard';
import { getSessionUiText } from '../lib/sessionUiText';
import { CardTile } from './CardTile';
import { CardPreviewModal } from './CardPreviewModal';
import { EmptyState } from './EmptyState';
import { EmptySelectionSlot, SelectedCardSlot } from './SelectedCardSlot';


function SelectedDropzone({ children, isOver, setNodeRef }) {
  return (
    <div
      ref={setNodeRef}
      className={`rounded-[24px] border border-slate-200 bg-white p-2.5 shadow-soft transition ${
        isOver ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-canvas' : ''
      }`}
    >
      {children}
    </div>
  );
}


function CardContextMenu({ menu, zoomLabel, onClose, onZoom }) {
  if (!menu) {
    return null;
  }

  const left = typeof window === 'undefined' ? menu.x : Math.max(12, Math.min(menu.x, window.innerWidth - 196));
  const top = typeof window === 'undefined' ? menu.y : Math.max(12, Math.min(menu.y, window.innerHeight - 84));

  return (
    <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(event) => event.preventDefault()}>
      <div className="surface absolute min-w-[11rem] px-2 py-2" style={{ left, top }} onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="flex w-full items-center justify-start rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={() => onZoom(menu.card)}
        >
          {zoomLabel}
        </button>
      </div>
    </div>
  );
}


export function SelectCardsPage() {
  const navigate = useNavigate();
  const {
    activeSessionKey,
    config,
    configError,
    finalizePath,
    isConfigLoading,
    language,
    selectedCards,
    addSelectedCard,
    removeSelectedCard,
    clearSelection,
    getCardLabelIds
  } = useAppState();
  const { errorMessage: guardErrorMessage, isChecking, sessionDetails } = useSessionAccessGuard();
  const text = getSessionUiText(language);

  const [activePane, setActivePane] = useState('right');
  const [activeCardId, setActiveCardId] = useState(() => cardCatalog[0]?.id ?? null);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  const [activeDragCardId, setActiveDragCardId] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const suppressPointerUntilRef = useRef(0);

  const selectedCardIds = selectedCards.filter((cardId) => Number.isInteger(cardId));
  const selectedCardSet = new Set(selectedCardIds);
  const selectedCardCount = selectedCardIds.length;
  const sessionError = activeSessionKey === 'default' ? text.select.inviteRequired : guardErrorMessage;

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 10
      }
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

  useEffect(() => {
    if (!contextMenu) {
      return undefined;
    }

    function handleDismiss(event) {
      if (event.type === 'keydown' && event.key !== 'Escape') {
        return;
      }
      setContextMenu(null);
    }

    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    window.addEventListener('keydown', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
      window.removeEventListener('keydown', handleDismiss);
    };
  }, [contextMenu]);

  const filteredCards = cardCatalog.filter((card) => {
    const labelIds = getCardLabelIds(card.id);
    return sessionDetails?.session_label_id ? labelIds.includes(Number(sessionDetails.session_label_id)) : false;
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

  useEffect(() => {
    if (activeSlotIndex < 0 || activeSlotIndex >= MAX_SELECTED_CARDS) {
      setActiveSlotIndex(0);
    }
  }, [activeSlotIndex]);

  const gridColumns = windowWidth >= 1536 ? 4 : windowWidth >= 640 ? 3 : 2;
  const slotGridColumns = 2;

  function getPreferredCatalogCardId() {
    return filteredCards.find((card) => !selectedCardSet.has(card.id))?.id ?? filteredCards[0]?.id ?? null;
  }

  function getPreferredSelectedSlotIndex() {
    const firstFilledIndex = selectedCards.findIndex((cardId) => Number.isInteger(cardId));
    return firstFilledIndex === -1 ? 0 : firstFilledIndex;
  }

  function scheduleFocus(elementId) {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(elementId);
      if (target) {
        target.focus();
        return;
      }

      window.setTimeout(() => {
        document.getElementById(elementId)?.focus();
      }, 0);
    });
  }

  function focusCatalogCard(cardId = getPreferredCatalogCardId()) {
    if (!cardId) {
      return;
    }
    setActivePane('right');
    setActiveCardId(cardId);
    scheduleFocus(`catalog-card-${cardId}`);
  }

  function focusSelectedSlot(slotIndex = getPreferredSelectedSlotIndex()) {
    const normalizedIndex = Math.max(0, Math.min(slotIndex, MAX_SELECTED_CARDS - 1));
    setActivePane('left');
    setActiveSlotIndex(normalizedIndex);
    scheduleFocus(`selected-slot-${normalizedIndex}`);
  }

  function handleAddCard(cardId, options = {}) {
    const { preferredIndex, trigger = 'programmatic' } = options;
    if (trigger === 'pointer' && Date.now() < suppressPointerUntilRef.current) {
      return;
    }

    if (selectedCardSet.has(cardId) || selectedCardCount >= MAX_SELECTED_CARDS) {
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
    const rowStart = Math.floor(currentIndex / gridColumns) * gridColumns;
    const rowEnd = Math.min(filteredCards.length - 1, rowStart + gridColumns - 1);
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = currentIndex >= rowEnd ? rowStart : currentIndex + 1;
        break;
      case 'ArrowLeft':
        nextIndex = currentIndex <= rowStart ? rowEnd : currentIndex - 1;
        break;
      case 'ArrowDown':
        nextIndex = currentIndex + gridColumns;
        if (nextIndex >= filteredCards.length) {
          nextIndex = currentIndex % gridColumns;
        }
        if (nextIndex >= filteredCards.length) {
          nextIndex = filteredCards.length - 1;
        }
        break;
      case 'ArrowUp':
        nextIndex = currentIndex - gridColumns;
        if (nextIndex < 0) {
          const columnIndex = currentIndex % gridColumns;
          nextIndex = filteredCards.length - 1;
          while (nextIndex % gridColumns !== columnIndex && nextIndex > columnIndex) {
            nextIndex -= 1;
          }
        }
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
        handleAddCard(cardId, { trigger: 'keyboard' });
        return;
      case 'Tab':
        event.preventDefault();
        focusSelectedSlot();
        return;
      default:
        return;
    }

    event.preventDefault();
    const nextCard = filteredCards[nextIndex];
    if (!nextCard) {
      return;
    }
    focusCatalogCard(nextCard.id);
  }

  function handleSelectedSlotKeyDown(event, index, hasCard, cardId) {
    let nextIndex = index;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = index >= MAX_SELECTED_CARDS - 1 ? 0 : index + 1;
        break;
      case 'ArrowLeft':
        nextIndex = index <= 0 ? MAX_SELECTED_CARDS - 1 : index - 1;
        break;
      case 'ArrowDown':
        nextIndex = index + slotGridColumns;
        if (nextIndex >= MAX_SELECTED_CARDS) {
          nextIndex = index % slotGridColumns;
        }
        break;
      case 'ArrowUp':
        nextIndex = index - slotGridColumns;
        if (nextIndex < 0) {
          const columnIndex = index % slotGridColumns;
          nextIndex = MAX_SELECTED_CARDS - 1;
          while (nextIndex % slotGridColumns !== columnIndex && nextIndex > columnIndex) {
            nextIndex -= 1;
          }
        }
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = MAX_SELECTED_CARDS - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (hasCard && Number.isInteger(cardId)) {
          removeSelectedCard(cardId);
          focusSelectedSlot(index);
        }
        return;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        if (hasCard && Number.isInteger(cardId)) {
          removeSelectedCard(cardId);
          focusSelectedSlot(index);
        }
        return;
      case 'Tab':
        event.preventDefault();
        focusCatalogCard();
        return;
      default:
        return;
    }

    event.preventDefault();
    focusSelectedSlot(nextIndex);
  }

  function handleCatalogCardActivate(cardId) {
    setActivePane('right');
    setActiveCardId(cardId);
  }

  function handleSelectedSlotActivate(index) {
    setActivePane('left');
    setActiveSlotIndex(index);
  }

  function handleOpenMenu(event, card) {
    event.preventDefault();
    setContextMenu({
      card,
      x: event.clientX,
      y: event.clientY
    });
  }

  function handleZoomCard(card) {
    setContextMenu(null);
    setPreviewCard(card);
  }

  function handleDragStart(event) {
    const cardId = event.active.data.current?.cardId;
    setActiveDragCardId(cardId ?? null);
    setContextMenu(null);
    suppressPointerUntilRef.current = Date.now() + 450;
    if (event.active.data.current?.source === 'catalog') {
      setActivePane('right');
    }
  }

  function handleDragCancel() {
    setActiveDragCardId(null);
    suppressPointerUntilRef.current = Date.now() + 250;
  }

  function handleDragEnd(event) {
    setActiveDragCardId(null);
    suppressPointerUntilRef.current = Date.now() + 250;
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
      if (selectedCardSet.has(activeData.cardId) || selectedCardCount >= MAX_SELECTED_CARDS) {
        return;
      }

      if (overData?.type === 'slot') {
        if (Number.isInteger(selectedCards[overData.index])) {
          return;
        }
        handleAddCard(activeData.cardId, { preferredIndex: overData.index });
        focusSelectedSlot(overData.index);
        return;
      }

      handleAddCard(activeData.cardId, {});
    }
  }

  if (isConfigLoading) {
    return <section className="surface px-6 py-8 text-sm font-semibold text-slate-600">{text.select.loading}</section>;
  }

  if (configError) {
    return (
      <EmptyState
        title={text.select.unavailableTitle}
        description={configError}
        tone="warning"
      />
    );
  }

  if (config.selectCardsBlocked) {
    return (
      <EmptyState
        title={text.select.blockedTitle}
        description={text.select.blockedDescription}
        actionLabel={text.common.backToHome}
        onAction={() => navigate('/')}
        tone="warning"
      />
    );
  }

  if (isChecking) {
    return <section className="surface px-6 py-8 text-sm font-semibold text-slate-600">{text.select.opening}</section>;
  }

  if (sessionError) {
    return (
      <EmptyState
        title={text.select.unavailableTitle}
        description={sessionError}
        actionLabel={text.common.backToHome}
        onAction={() => navigate('/')}
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
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.12fr)_minmax(19rem,0.88fr)]">
        <section className="surface flex min-h-[34rem] flex-col px-4 py-4 md:h-[calc(100vh-10.5rem)] md:overflow-hidden md:px-5">
          <div className="flex min-h-[4.25rem] items-start justify-between border-b border-slate-200 pb-2">
            <p className="eyebrow">{text.select.availableCards}</p>
            <span className="rounded-full bg-brand-600 px-3 py-1 text-sm font-semibold text-white shadow">
              {selectedCardCount}/{MAX_SELECTED_CARDS}
            </span>
          </div>

          <div className="mt-2 flex-1 md:overflow-y-auto md:pr-1">
            {filteredCards.length ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 2xl:grid-cols-4">
                {filteredCards.map((card) => (
                  <CardTile
                    key={card.id}
                    card={card}
                    isActive={activePane === 'right' && card.id === activeCardId}
                    isSelected={selectedCardSet.has(card.id)}
                    selectedLabel={text.common.selected}
                    onActivate={handleCatalogCardActivate}
                    onAdd={(cardId, trigger) => handleAddCard(cardId, { trigger })}
                    onOpenMenu={handleOpenMenu}
                    onKeyDown={handleTileKeyDown}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={text.select.noCardsTitle}
                description={text.select.noCardsDescription}
              />
            )}
          </div>
        </section>

        <section className="surface flex min-h-[34rem] flex-col px-4 py-4 md:h-[calc(100vh-10.5rem)] md:overflow-hidden md:px-5">
          <div className="flex min-h-[4.25rem] flex-col gap-2 border-b border-slate-200 pb-2 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="eyebrow">{text.common.session}</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                {sessionDetails?.session_name || text.select.selectionTitle}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="action-chip" disabled={!selectedCardCount} onClick={clearSelection}>
                {text.select.clearSelection}
              </button>
              <button
                type="button"
                className="action-chip action-chip-active"
                disabled={!selectedCardCount}
                onClick={() => navigate(finalizePath)}
              >
                {text.select.finalizeSelection}
              </button>
            </div>
          </div>

          <div className="mt-2 flex-1 md:overflow-y-auto md:pr-1">
            <SelectedDropzone isOver={selectionBoardOver} setNodeRef={setSelectionBoardRef}>
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: MAX_SELECTED_CARDS }, (_, index) => {
                  const cardId = selectedCards[index];
                  const card = Number.isInteger(cardId) ? cardCatalog.find((catalogCard) => catalogCard.id === cardId) : null;
                  if (!card) {
                    return (
                      <EmptySelectionSlot
                        key={`slot-${index}`}
                        index={index}
                        labels={{
                          slotPrefix: text.select.slotPrefix,
                          emptySlotHint: text.select.emptySlotHint,
                        }}
                        isActive={activePane === 'left' && activeSlotIndex === index}
                        onActivate={() => handleSelectedSlotActivate(index)}
                        onKeyDown={handleSelectedSlotKeyDown}
                      />
                    );
                  }

                  return (
                    <SelectedCardSlot
                      key={`slot-card-${index}-${card.id}`}
                      card={card}
                      index={index}
                      removeLabel={text.select.removeCard}
                      isActive={activePane === 'left' && activeSlotIndex === index}
                      onActivate={() => handleSelectedSlotActivate(index)}
                      onKeyDown={handleSelectedSlotKeyDown}
                      onOpenMenu={handleOpenMenu}
                      onRemove={removeSelectedCard}
                    />
                  );
                })}
              </div>
            </SelectedDropzone>
          </div>
        </section>
      </div>

      <CardContextMenu
        menu={contextMenu}
        zoomLabel={text.common.zoomCard}
        onClose={() => setContextMenu(null)}
        onZoom={handleZoomCard}
      />

      <CardPreviewModal
        card={previewCard}
        title={text.select.previewTitle}
        closeLabel={text.common.closePreview}
        selectedLabel=""
        onClose={() => setPreviewCard(null)}
      />

      <DragOverlay>
        {activeDragCardId ? (
          <div id="drag-overlay-card" className="aspect-square w-28 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 shadow-card">
            <img
              src={cardCatalog.find((card) => card.id === activeDragCardId)?.smallImage}
              alt={`Card ${activeDragCardId}`}
              className="aspect-square h-full w-full rounded-[18px] object-cover"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
