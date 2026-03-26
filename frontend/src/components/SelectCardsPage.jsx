import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

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
      className={`rounded-[28px] border border-slate-200 bg-white p-3 shadow-soft transition ${
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

  const [activeCardId, setActiveCardId] = useState(() => cardCatalog[0]?.id ?? null);
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

  const gridColumns = windowWidth >= 1280 ? 4 : windowWidth >= 768 ? 2 : 1;

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
        handleAddCard(cardId, { trigger: 'keyboard' });
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
      <div className="grid gap-5 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)]">
        <section className="surface flex min-h-[34rem] flex-col px-4 py-4 md:px-5 xl:h-[calc(100vh-10.5rem)] xl:overflow-hidden">
          <div className="flex min-h-[5.75rem] flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="eyebrow">{text.common.session}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {sessionDetails?.session_name || text.select.selectionTitle}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-600 px-3 py-1 text-sm font-semibold text-white shadow">
                {selectedCardCount}/{MAX_SELECTED_CARDS}
              </span>
              <button
                type="button"
                className="action-chip action-chip-active"
                disabled={!selectedCardCount}
                onClick={() => navigate(finalizePath)}
              >
                {text.select.finalizeSelection}
              </button>
              <button type="button" className="action-chip" disabled={!selectedCardCount} onClick={clearSelection}>
                {text.select.clearSelection}
              </button>
            </div>
          </div>

          <div className="mt-4 flex-1 xl:overflow-y-auto xl:pr-1">
            <SelectedDropzone isOver={selectionBoardOver} setNodeRef={setSelectionBoardRef}>
              <div className="grid gap-3 sm:grid-cols-2">
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
                      />
                    );
                  }

                  return (
                    <SelectedCardSlot
                      key={`slot-card-${index}-${card.id}`}
                      card={card}
                      index={index}
                      removeLabel={text.select.removeCard}
                      onOpenMenu={handleOpenMenu}
                      onRemove={removeSelectedCard}
                    />
                  );
                })}
              </div>
            </SelectedDropzone>
          </div>
        </section>

        <section className="surface flex min-h-[34rem] flex-col px-4 py-4 md:px-5 xl:h-[calc(100vh-10.5rem)] xl:overflow-hidden">
          <div className="flex min-h-[5.75rem] items-start justify-between border-b border-slate-200 pb-4">
            <p className="eyebrow">{text.select.availableCards}</p>
          </div>

          <div className="mt-4 flex-1 xl:overflow-y-auto xl:pr-1">
            {filteredCards.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {filteredCards.map((card) => (
                  <CardTile
                    key={card.id}
                    card={card}
                    isActive={card.id === activeCardId}
                    isSelected={selectedCardSet.has(card.id)}
                    onActivate={setActiveCardId}
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
        selectedLabel={previewCard && selectedCardSet.has(previewCard.id) ? text.common.selected : ''}
        onClose={() => setPreviewCard(null)}
      />

      <DragOverlay>
        {activeDragCardId ? (
          <div className="w-28 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 shadow-card">
            <img
              src={cardCatalog.find((card) => card.id === activeDragCardId)?.smallImage}
              alt={`Card ${activeDragCardId}`}
              className="aspect-[4/5] w-full rounded-[18px] object-cover"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
