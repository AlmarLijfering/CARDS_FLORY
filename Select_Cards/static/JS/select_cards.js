(function () {
  const config = window.selectCardsConfig || {};
  const maxCards = Number(config.maxCards || 6);
  const routes = config.routes || {};

  const finalizeBtn = document.getElementById('finalize-btn');
  const selectionCount = document.getElementById('selection-count');
  const dropzones = Array.from(document.querySelectorAll('.dropzone'));
  const dropzoneWrapper = document.querySelector('.dropzone-wrapper');
  const placeholders = Array.from(document.querySelectorAll('.placeholder'));
  const searchInput = document.getElementById('search-input');
  const galleryStatus = document.getElementById('gallery-status');
  const galleryLoading = document.getElementById('gallery-loading');
  const languageSelect = document.getElementById('language-select');
  const leftContainer = document.getElementById('left-container');
  const galleryGrid = document.getElementById('gallery-grid');
  const filterChipRow = document.getElementById('filter-chip-row');
  const filterChips = Array.from(document.querySelectorAll('.filter-chip'));
  const galleryEmptyState = document.getElementById('gallery-empty-state');
  const clearGalleryFiltersButton = document.getElementById('clear-gallery-filters');
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const guidanceStorageKey = 'selectCardsGuidanceCollapsed';
  const guidanceMediaQuery = window.matchMedia('(max-width: 767.98px)');

  let draggedElement = null;
  let draggedFromPlaceholder = false;
  let placementSucceeded = false;
  let selectedCardsCount = 0;
  let contextMenu = null;
  let zoomOverlay = null;
  let currentLanguage = config.currentLanguage || 'en';
  let activeFilter = filterChips.find((chip) => chip.classList.contains('is-active'))?.dataset.labelId || 'all';
  let rovingCardId = null;

  const inwardZoomClasses = [
    'zoom-inward-top-left',
    'zoom-inward-top-right',
    'zoom-inward-bottom-left',
    'zoom-inward-bottom-right',
    'zoom-inward-top',
    'zoom-inward-bottom',
    'zoom-inward-left',
    'zoom-inward-right'
  ];

  const translations = {
    en: {
      selectionHeading: 'Your selection',
      selectionHint: 'Click or tap to add, use arrow keys to browse, and move buttons to reorder.',
      finalize: 'Finalize Selection',
      limitHint: 'Up to 6 cards',
      nextStep: 'Next step: after finalizing, you will see an overview to review or share your selected cards.',
      availableImages: 'Available Images',
      mobileHint: 'Tap a card to add it above',
      allChip: 'All',
      searchPlaceholder: 'Search by card number or label',
      selectedSuffix: 'selected',
      cardsShown: 'cards shown',
      zoom: 'Zoom',
      zoomedCard: 'Zoomed card',
      removeCard: 'Remove card {id} from selection',
      moveEarlier: 'Move card {id} earlier',
      moveLater: 'Move card {id} later',
      selectionOrder: 'Selected cards order',
      slotEmpty: 'Selection slot {slot}, empty',
      slotFilled: 'Selection slot {slot}, contains card {id}',
      noCardsMatch: 'No cards match this filter.',
      emptyStateHint: 'Clear the search or switch labels to keep going.',
      clearFilters: 'Clear filters',
      saveError: 'Unable to save your selection. Please try again.'
    },
    nl: {
      selectionHeading: 'Jouw selectie',
      selectionHint: 'Klik of tik om toe te voegen, gebruik pijltjes om te bladeren en verplaatsknoppen om te herschikken.',
      finalize: 'Selectie afronden',
      limitHint: 'Maximaal 6 kaarten',
      nextStep: 'Volgende stap: na het afronden zie je een overzicht om je kaarten te controleren of te delen.',
      availableImages: 'Beschikbare afbeeldingen',
      mobileHint: 'Tik op een kaart om die hierboven toe te voegen',
      allChip: 'Alles',
      searchPlaceholder: 'Zoek op kaartnummer of label',
      selectedSuffix: 'geselecteerd',
      cardsShown: 'kaarten getoond',
      zoom: 'Vergroten',
      zoomedCard: 'Vergrote kaart',
      removeCard: 'Verwijder kaart {id} uit de selectie',
      moveEarlier: 'Verplaats kaart {id} naar voren',
      moveLater: 'Verplaats kaart {id} naar achteren',
      selectionOrder: 'Volgorde van geselecteerde kaarten',
      slotEmpty: 'Selectievak {slot}, leeg',
      slotFilled: 'Selectievak {slot}, bevat kaart {id}',
      noCardsMatch: 'Geen kaarten gevonden voor dit filter.',
      emptyStateHint: 'Wis de zoekopdracht of kies een ander label om verder te gaan.',
      clearFilters: 'Filters wissen',
      saveError: 'Je selectie kon niet worden opgeslagen. Probeer het opnieuw.'
    },
    ro: {
      selectionHeading: 'Selectia ta',
      selectionHint: 'Da click sau atinge pentru a adauga, foloseste sagetile pentru navigare si butoanele de mutare pentru reordonare.',
      finalize: 'Finalizeaza selectia',
      limitHint: 'Pana la 6 carti',
      nextStep: 'Pasul urmator: dupa finalizare vei vedea o prezentare pentru a revizui sau partaja cartile selectate.',
      availableImages: 'Imagini disponibile',
      mobileHint: 'Atinge o carte pentru a o adauga mai sus',
      allChip: 'Toate',
      searchPlaceholder: 'Cauta dupa numarul cartii sau eticheta',
      selectedSuffix: 'selectate',
      cardsShown: 'carti afisate',
      zoom: 'Mareste',
      zoomedCard: 'Carte marita',
      removeCard: 'Elimina cartea {id} din selectie',
      moveEarlier: 'Muta cartea {id} mai devreme',
      moveLater: 'Muta cartea {id} mai tarziu',
      selectionOrder: 'Ordinea cartilor selectate',
      slotEmpty: 'Slotul de selectie {slot}, gol',
      slotFilled: 'Slotul de selectie {slot}, contine cartea {id}',
      noCardsMatch: 'Nicio carte nu corespunde acestui filtru.',
      emptyStateHint: 'Sterge cautarea sau schimba eticheta pentru a continua.',
      clearFilters: 'Sterge filtrele',
      saveError: 'Selectia nu a putut fi salvata. Incearca din nou.'
    }
  };

  function t(key) {
    const dict = translations[currentLanguage] || translations.en;
    return dict[key] || translations.en[key] || key;
  }

  function interpolate(key, params) {
    return t(key).replace(/\{(\w+)\}/g, (_, name) => params[name] || '');
  }

  function readStoredGuidancePreference() {
    try {
      return window.localStorage.getItem(guidanceStorageKey) === '1';
    } catch (error) {
      return false;
    }
  }

  function persistGuidancePreference(isCollapsed) {
    try {
      window.localStorage.setItem(guidanceStorageKey, isCollapsed ? '1' : '0');
    } catch (error) {
      // ignore storage failures
    }
  }

  function collapseGuidance() {
    if (!guidanceMediaQuery.matches) {
      return;
    }
    document.body.classList.add('selection-guidance-collapsed');
    persistGuidancePreference(true);
  }

  function getAllGalleryCards() {
    return placeholders
      .map((slot) => slot.querySelector('.card'))
      .filter(Boolean);
  }

  function isVisibleGalleryCard(cardElement) {
    const slot = cardElement.closest('.placeholder');
    return Boolean(slot) && !slot.classList.contains('hidden-by-filter');
  }

  function isNavigableGalleryCard(cardElement) {
    return cardElement.closest('.placeholder')
      && isVisibleGalleryCard(cardElement)
      && cardElement.getAttribute('aria-disabled') !== 'true'
      && !cardElement.classList.contains('selected-in-gallery');
  }

  function getNavigableGalleryCards() {
    return getAllGalleryCards().filter(isNavigableGalleryCard);
  }

  function updateGalleryTabStops(preferredCard = null) {
    const allCards = getAllGalleryCards();
    const navigableCards = getNavigableGalleryCards();

    allCards.forEach((card) => {
      if (card.closest('.placeholder')) {
        card.setAttribute('tabindex', '-1');
      }
    });

    if (!navigableCards.length) {
      rovingCardId = null;
      return;
    }

    let targetCard = preferredCard && navigableCards.includes(preferredCard)
      ? preferredCard
      : navigableCards.find((card) => card.dataset.id === rovingCardId);

    if (!targetCard) {
      targetCard = navigableCards[0];
    }

    targetCard.setAttribute('tabindex', '0');
    rovingCardId = targetCard.dataset.id;
  }

  function focusGalleryCard(cardElement) {
    if (!cardElement) {
      return;
    }
    updateGalleryTabStops(cardElement);
    cardElement.focus();
  }

  function getGalleryColumns() {
    if (!galleryGrid) {
      return 1;
    }

    const firstVisibleSlot = placeholders.find((slot) => !slot.classList.contains('hidden-by-filter'));
    if (!firstVisibleSlot) {
      return 1;
    }

    const slotWidth = firstVisibleSlot.getBoundingClientRect().width || 128;
    const gridWidth = galleryGrid.getBoundingClientRect().width || slotWidth;
    return Math.max(1, Math.round(gridWidth / slotWidth));
  }

  function getFirstEmptyDropzone() {
    return dropzones.find((zone) => zone.classList.contains('empty'));
  }

  function updateDropzoneAccessibility(dropzone) {
    if (!dropzone) {
      return;
    }

    const slot = dropzone.dataset.zone || '';
    const card = dropzone.querySelector('.card');

    if (!card || dropzone.classList.contains('empty')) {
      dropzone.setAttribute('aria-label', interpolate('slotEmpty', { slot }));
      return;
    }

    dropzone.setAttribute('aria-label', interpolate('slotFilled', { slot, id: card.dataset.id }));
  }

  function updateSelectedCardControls() {
    if (dropzoneWrapper) {
      dropzoneWrapper.setAttribute('aria-label', t('selectionOrder'));
    }

    dropzones.forEach((dropzone, index) => {
      const card = dropzone.querySelector('.card');
      if (!card) {
        updateDropzoneAccessibility(dropzone);
        return;
      }

      const cardId = card.dataset.id;
      const moveEarlierBtn = card.querySelector('[data-action="move-earlier"]');
      const moveLaterBtn = card.querySelector('[data-action="move-later"]');
      const removeBtn = card.querySelector('.remove-btn');

      if (moveEarlierBtn) {
        moveEarlierBtn.disabled = index === 0;
        moveEarlierBtn.setAttribute('aria-label', interpolate('moveEarlier', { id: cardId }));
        moveEarlierBtn.title = interpolate('moveEarlier', { id: cardId });
      }

      if (moveLaterBtn) {
        moveLaterBtn.disabled = index === dropzones.length - 1;
        moveLaterBtn.setAttribute('aria-label', interpolate('moveLater', { id: cardId }));
        moveLaterBtn.title = interpolate('moveLater', { id: cardId });
      }

      if (removeBtn) {
        removeBtn.setAttribute('aria-label', interpolate('removeCard', { id: cardId }));
        removeBtn.title = interpolate('removeCard', { id: cardId });
      }

      updateDropzoneAccessibility(dropzone);
    });
  }

  function updateSelectionCount() {
    if (!selectionCount) {
      return;
    }

    selectionCount.textContent = `${selectedCardsCount}/${maxCards} ${t('selectedSuffix')}`;
    selectionCount.classList.toggle('text-bg-primary', selectedCardsCount > 0);
    selectionCount.classList.toggle('text-bg-light', selectedCardsCount === 0);
  }

  function updateFinalizeButton() {
    if (!finalizeBtn) {
      return;
    }

    finalizeBtn.disabled = selectedCardsCount === 0;
    finalizeBtn.textContent = selectedCardsCount > 0
      ? `${t('finalize')} (${selectedCardsCount}/${maxCards})`
      : t('finalize');
    updateSelectionCount();
  }

  function updateFilterChipLabels() {
    const labelKeyByLanguage = {
      en: 'labelEn',
      nl: 'labelNl',
      ro: 'labelRo'
    };

    filterChips.forEach((chip) => {
      const count = chip.dataset.count || '0';
      const localizedLabel = chip.dataset.labelId === 'all'
        ? t('allChip')
        : (chip.dataset[labelKeyByLanguage[currentLanguage]] || chip.dataset.labelEn || '');

      chip.textContent = `${localizedLabel} (${count})`;
      chip.setAttribute('aria-pressed', chip.classList.contains('is-active') ? 'true' : 'false');
    });
  }

  function setActiveFilter(labelId) {
    activeFilter = labelId;
    filterChips.forEach((chip) => {
      const isActive = chip.dataset.labelId === labelId;
      chip.classList.toggle('is-active', isActive);
      chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function getCardImageSource(cardElement) {
    if (!cardElement) {
      return '';
    }

    if (cardElement.dataset.large) {
      return cardElement.dataset.large;
    }

    const img = cardElement.querySelector('img.large, img.small, img');
    return img ? img.src : '';
  }

  function moveSelectedCard(cardElement, direction) {
    const currentDropzone = cardElement.closest('.dropzone');
    if (!currentDropzone) {
      return false;
    }

    const currentIndex = dropzones.indexOf(currentDropzone);
    const targetDropzone = dropzones[currentIndex + direction];
    if (!targetDropzone) {
      return false;
    }

    const targetCard = targetDropzone.querySelector('.card');

    if (targetCard) {
      currentDropzone.innerHTML = '';
      currentDropzone.appendChild(targetCard);
      currentDropzone.classList.remove('empty');
    } else {
      currentDropzone.innerHTML = '';
      currentDropzone.classList.add('empty');
    }

    targetDropzone.innerHTML = '';
    targetDropzone.appendChild(cardElement);
    targetDropzone.classList.remove('empty');

    updateFinalizeButton();
    updateSelectedCardControls();
    return true;
  }

  function createSelectedCard(sourceElement, dropzone) {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.dataset.id = sourceElement.dataset.id;

    const controls = document.createElement('div');
    controls.className = 'selection-card-controls';
    controls.addEventListener('click', (event) => event.stopPropagation());
    controls.addEventListener('pointerdown', (event) => event.stopPropagation());

    const moveEarlierBtn = document.createElement('button');
    moveEarlierBtn.type = 'button';
    moveEarlierBtn.className = 'selection-action-btn';
    moveEarlierBtn.dataset.action = 'move-earlier';
    moveEarlierBtn.innerHTML = '<i class="bi bi-arrow-left" aria-hidden="true"></i>';
    moveEarlierBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      moveSelectedCard(card, -1);
    });
    controls.appendChild(moveEarlierBtn);

    const moveLaterBtn = document.createElement('button');
    moveLaterBtn.type = 'button';
    moveLaterBtn.className = 'selection-action-btn';
    moveLaterBtn.dataset.action = 'move-later';
    moveLaterBtn.innerHTML = '<i class="bi bi-arrow-right" aria-hidden="true"></i>';
    moveLaterBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      moveSelectedCard(card, 1);
    });
    controls.appendChild(moveLaterBtn);

    const img = document.createElement('img');
    img.src = getCardImageSource(sourceElement);
    img.classList.add('large');
    card.appendChild(img);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'selection-action-btn remove-btn';
    removeBtn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';
    removeBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const slot = document.getElementById(`slot-${sourceElement.dataset.id}`);
      if (slot) {
        slot.classList.remove('empty', 'selected');
        slot.appendChild(sourceElement);
        sourceElement.classList.remove('selected-in-gallery');
        sourceElement.setAttribute('aria-disabled', 'false');
        sourceElement.setAttribute('draggable', 'true');
      }

      dropzone.classList.add('empty');
      card.remove();
      selectedCardsCount = Math.max(selectedCardsCount - 1, 0);
      updateFinalizeButton();
      updateGalleryVisibility(sourceElement);
      updateSelectedCardControls();
      if (isNavigableGalleryCard(sourceElement)) {
        focusGalleryCard(sourceElement);
      } else {
        updateGalleryTabStops();
        searchInput?.focus();
      }
    });
    controls.appendChild(removeBtn);
    card.appendChild(controls);

    bindCardInteractions(card);
    return card;
  }

  function placeCardInDropzone(cardElement, dropzone) {
    const originDropzone = cardElement.closest('.dropzone');
    const movingExistingCard = Boolean(originDropzone);

    if (!dropzone || (!movingExistingCard && selectedCardsCount >= maxCards)) {
      return false;
    }

    if (originDropzone && originDropzone !== dropzone) {
      originDropzone.classList.add('empty');
      originDropzone.innerHTML = '';
      selectedCardsCount = Math.max(selectedCardsCount - 1, 0);
    }

    if (!dropzone.classList.contains('empty')) {
      if (originDropzone) {
        originDropzone.appendChild(cardElement);
        originDropzone.classList.remove('empty');
        selectedCardsCount = Math.min(selectedCardsCount + 1, maxCards);
        updateFinalizeButton();
      }
      return false;
    }

    dropzone.classList.remove('empty');
    dropzone.appendChild(createSelectedCard(cardElement, dropzone));

    const slot = document.getElementById(`slot-${cardElement.dataset.id}`);
    if (slot) {
      slot.classList.add('empty', 'selected');
      cardElement.setAttribute('aria-disabled', 'true');
      cardElement.setAttribute('draggable', 'false');
      if (!movingExistingCard) {
        cardElement.classList.add('selected-in-gallery');
      }
    }

    selectedCardsCount += 1;
    updateFinalizeButton();
    updateGalleryVisibility();
    updateSelectedCardControls();
    return true;
  }

  function handleCardSelection(cardElement) {
    if (!cardElement.closest('.placeholder')) {
      return;
    }

    if (cardElement.classList.contains('selected-in-gallery') || cardElement.getAttribute('aria-disabled') === 'true') {
      return;
    }

    const targetDropzone = getFirstEmptyDropzone();
    const focusShouldAdvance = document.activeElement === cardElement;
    const navigableBefore = getNavigableGalleryCards();
    const previousIndex = navigableBefore.indexOf(cardElement);

    if (targetDropzone && placeCardInDropzone(cardElement, targetDropzone)) {
      placementSucceeded = true;
      collapseGuidance();

      if (focusShouldAdvance) {
        const navigableAfter = getNavigableGalleryCards();
        const nextCard = navigableAfter[previousIndex] || navigableAfter[navigableAfter.length - 1];
        if (nextCard) {
          focusGalleryCard(nextCard);
        } else {
          searchInput?.focus();
        }
      }
    }
  }

  function getVisibleGalleryBounds() {
    const visibleSlots = placeholders.filter((slot) => !slot.classList.contains('hidden-by-filter'));
    if (!visibleSlots.length) {
      return null;
    }

    const containerRect = leftContainer ? leftContainer.getBoundingClientRect() : null;
    const rects = visibleSlots.map((slot) => slot.getBoundingClientRect());
    const bounds = {
      left: Math.min(...rects.map((rect) => rect.left)),
      right: Math.max(...rects.map((rect) => rect.right)),
      top: Math.min(...rects.map((rect) => rect.top)),
      bottom: Math.max(...rects.map((rect) => rect.bottom))
    };

    if (!containerRect) {
      return bounds;
    }

    return {
      left: Math.max(bounds.left, containerRect.left),
      right: Math.min(bounds.right, containerRect.right),
      top: Math.max(bounds.top, containerRect.top),
      bottom: Math.min(bounds.bottom, containerRect.bottom)
    };
  }

  function applyInwardZoomClass(cardElement) {
    if (!cardElement || cardElement.classList.contains('selected-in-gallery')) {
      return;
    }

    inwardZoomClasses.forEach((cssClass) => cardElement.classList.remove(cssClass));

    const slot = cardElement.closest('.placeholder');
    const rect = (slot || cardElement).getBoundingClientRect();
    const bounds = getVisibleGalleryBounds();
    if (!bounds) {
      return;
    }

    const edgeThreshold = 12;
    const nearTop = rect.top <= bounds.top + edgeThreshold;
    const nearBottom = rect.bottom >= bounds.bottom - edgeThreshold;
    const nearLeft = rect.left <= bounds.left + edgeThreshold;
    const nearRight = rect.right >= bounds.right - edgeThreshold;

    if (nearTop && nearLeft) {
      cardElement.classList.add('zoom-inward-top-left');
      return;
    }
    if (nearTop && nearRight) {
      cardElement.classList.add('zoom-inward-top-right');
      return;
    }
    if (nearBottom && nearLeft) {
      cardElement.classList.add('zoom-inward-bottom-left');
      return;
    }
    if (nearBottom && nearRight) {
      cardElement.classList.add('zoom-inward-bottom-right');
      return;
    }
    if (nearTop) {
      cardElement.classList.add('zoom-inward-top');
      return;
    }
    if (nearBottom) {
      cardElement.classList.add('zoom-inward-bottom');
      return;
    }
    if (nearLeft) {
      cardElement.classList.add('zoom-inward-left');
      return;
    }
    if (nearRight) {
      cardElement.classList.add('zoom-inward-right');
    }
  }

  function closeContextMenu() {
    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
    }
  }

  function closeZoomOverlay() {
    if (zoomOverlay) {
      zoomOverlay.remove();
      zoomOverlay = null;
    }
  }

  function openZoomOverlay(imageSrc) {
    closeZoomOverlay();
    zoomOverlay = document.createElement('div');
    zoomOverlay.className = 'card-zoom-overlay';

    const zoomImg = document.createElement('img');
    zoomImg.src = imageSrc;
    zoomImg.alt = t('zoomedCard');
    zoomOverlay.appendChild(zoomImg);

    const dismiss = () => closeZoomOverlay();
    zoomOverlay.addEventListener('click', dismiss);
    zoomImg.addEventListener('click', dismiss);
    document.body.appendChild(zoomOverlay);
  }

  function getCardZoomSource(cardElement) {
    return getCardImageSource(cardElement) || null;
  }

  function openCardContextMenu(event, cardElement) {
    event.preventDefault();
    event.stopPropagation();
    closeContextMenu();

    const zoomSrc = getCardZoomSource(cardElement);
    if (!zoomSrc) {
      return;
    }

    contextMenu = document.createElement('div');
    contextMenu.className = 'card-context-menu';

    const zoomAction = document.createElement('button');
    zoomAction.className = 'context-action';
    zoomAction.type = 'button';
    zoomAction.textContent = t('zoom');
    zoomAction.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      closeContextMenu();
      openZoomOverlay(zoomSrc);
    });

    contextMenu.appendChild(zoomAction);
    document.body.appendChild(contextMenu);

    const x = Math.min(event.clientX, window.innerWidth - contextMenu.offsetWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - contextMenu.offsetHeight - 8);
    contextMenu.style.left = `${Math.max(8, x)}px`;
    contextMenu.style.top = `${Math.max(8, y)}px`;
  }

  function handleDragStart(event) {
    draggedElement = event.target.closest('.card');
    if (!draggedElement) {
      return;
    }

    draggedFromPlaceholder = Boolean(draggedElement.closest('.placeholder'));
    placementSucceeded = false;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedElement.dataset.id || '');
    }

    draggedElement.classList.add('dragging');
    setTimeout(() => {
      draggedElement.style.visibility = 'hidden';
      const parent = draggedElement.closest('.placeholder');
      if (parent) {
        parent.classList.add('empty');
      }
    }, 0);
  }

  function handleDragEnd() {
    if (!draggedElement) {
      return;
    }

    const shouldHide = draggedFromPlaceholder && placementSucceeded;
    draggedElement.style.visibility = shouldHide ? 'hidden' : 'visible';
    draggedElement.classList.remove('dragging');

    const parent = draggedElement.closest('.placeholder');
    if (parent) {
      parent.classList.toggle('empty', shouldHide);
    }

    draggedElement = null;
    draggedFromPlaceholder = false;
    placementSucceeded = false;
  }

  function moveFocus(currentCard, key) {
    const visibleCards = getNavigableGalleryCards();
    const currentIndex = visibleCards.indexOf(currentCard);
    if (currentIndex === -1) {
      return;
    }

    const columns = getGalleryColumns();
    let nextIndex = currentIndex;
    if (key === 'ArrowRight') nextIndex = Math.min(visibleCards.length - 1, currentIndex + 1);
    if (key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);
    if (key === 'ArrowDown') nextIndex = Math.min(visibleCards.length - 1, currentIndex + columns);
    if (key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - columns);

    focusGalleryCard(visibleCards[nextIndex]);
  }

  function bindCardInteractions(card) {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('mouseenter', () => applyInwardZoomClass(card));
    card.addEventListener('contextmenu', (event) => openCardContextMenu(event, card));
    card.addEventListener('focus', () => {
      if (isNavigableGalleryCard(card)) {
        updateGalleryTabStops(card);
      }
    });
    card.addEventListener('click', () => handleCardSelection(card));
    card.addEventListener('dblclick', () => handleCardSelection(card));
    card.addEventListener('keydown', (event) => {
      const inSelectionPanel = Boolean(card.closest('.dropzone'));

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleCardSelection(card);
        return;
      }

      if (inSelectionPanel && (event.key === 'ArrowLeft' || event.key === 'ArrowUp')) {
        event.preventDefault();
        moveSelectedCard(card, -1);
        return;
      }

      if (inSelectionPanel && (event.key === 'ArrowRight' || event.key === 'ArrowDown')) {
        event.preventDefault();
        moveSelectedCard(card, 1);
        return;
      }

      if (!inSelectionPanel && event.key.startsWith('Arrow')) {
        event.preventDefault();
        moveFocus(card, event.key);
      }
    });
  }

  function clearGalleryFilters() {
    if (searchInput) {
      searchInput.value = '';
    }

    setActiveFilter('all');
    updateGalleryVisibility();
    searchInput?.focus();
  }

  function updateGalleryVisibility(preferredCard = null) {
    const term = (searchInput?.value || '').trim().toLowerCase();
    let visible = 0;

    placeholders.forEach((slot) => {
      const matchesSearch = (slot.dataset.search || '').includes(term);
      const labelToken = `,${activeFilter},`;
      const matchesLabel = activeFilter === 'all' || (slot.dataset.labelIds || '').includes(labelToken);
      const show = matchesSearch && matchesLabel;
      slot.classList.toggle('hidden-by-filter', !show);
      if (show) {
        visible += 1;
      }
    });

    if (galleryStatus) {
      galleryStatus.textContent = `${visible} ${t('cardsShown')}`;
    }

    if (galleryLoading) {
      galleryLoading.style.display = 'none';
    }

    const isEmpty = visible === 0;
    if (galleryEmptyState) {
      galleryEmptyState.hidden = !isEmpty;
      galleryEmptyState.classList.toggle('d-none', !isEmpty);
    }
    if (galleryGrid) {
      galleryGrid.hidden = isEmpty;
    }

    updateGalleryTabStops(preferredCard);
  }

  function persistLanguage(language) {
    if (!routes.setLanguage) {
      return;
    }

    fetch(routes.setLanguage, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language })
    }).catch(() => {});
  }

  function applyLanguage(language) {
    currentLanguage = translations[language] ? language : 'en';
    const dict = translations[currentLanguage] || translations.en;

    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n;
      if (dict[key]) {
        node.textContent = dict[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      const key = node.dataset.i18nPlaceholder;
      if (dict[key]) {
        node.placeholder = dict[key];
      }
    });

    updateFilterChipLabels();
    updateFinalizeButton();
    updateGalleryVisibility();
    updateSelectedCardControls();
    persistLanguage(currentLanguage);
  }

  function collectSelectedCards() {
    const selectedCards = [];
    dropzones.forEach((dropzone) => {
      if (!dropzone.classList.contains('empty')) {
        const card = dropzone.querySelector('.card');
        if (card) {
          selectedCards.push(card.dataset.id);
        }
      }
    });
    return selectedCards;
  }

  function submitSelection() {
    if (!routes.finalize) {
      return;
    }

    fetch(routes.finalize, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedCards: collectSelectedCards(), language: currentLanguage })
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || t('saveError'));
        }
        return data;
      })
      .then((data) => {
        if (data.status === 'success' && routes.overview) {
          window.location.href = routes.overview;
        }
      })
      .catch((error) => {
        window.alert(error.message || t('saveError'));
      });
  }

  document.querySelectorAll('.card').forEach(bindCardInteractions);

  searchInput?.addEventListener('input', () => {
    updateGalleryVisibility();
    if (searchInput.value.trim()) {
      collapseGuidance();
    }
  });

  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      setActiveFilter(chip.dataset.labelId || 'all');
      updateGalleryVisibility();
      collapseGuidance();
    });
  });

  clearGalleryFiltersButton?.addEventListener('click', clearGalleryFilters);
  languageSelect?.addEventListener('change', () => applyLanguage(languageSelect.value));
  finalizeBtn?.addEventListener('click', submitSelection);

  dropzones.forEach((dropzone) => {
    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    });

    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      if (draggedElement) {
        placementSucceeded = placeCardInDropzone(draggedElement, dropzone);
        draggedElement = null;
      }
    });

    if (isTouchDevice) {
      dropzone.addEventListener('click', () => {
        if (draggedElement) {
          placementSucceeded = placeCardInDropzone(draggedElement, dropzone);
          draggedElement = null;
        }
      });
    }
  });

  document.addEventListener('click', () => {
    closeContextMenu();
    closeZoomOverlay();
  });

  document.addEventListener('contextmenu', (event) => {
    if (!event.target.closest('.card-context-menu') && !event.target.closest('.card')) {
      closeContextMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeContextMenu();
      closeZoomOverlay();
    }
  });

  window.addEventListener('scroll', closeContextMenu, true);
  window.addEventListener('resize', closeContextMenu);

  if (readStoredGuidancePreference()) {
    document.body.classList.add('selection-guidance-collapsed');
  }

  setActiveFilter(activeFilter);
  updateFinalizeButton();
  updateSelectedCardControls();
  applyLanguage(currentLanguage);
}());
