(function () {
  const config = window.selectCardsConfig || {};
  const maxCards = Number(config.maxCards || 6);
  const routes = config.routes || {};

  const finalizeBtn = document.getElementById('finalize-btn');
  const selectionCount = document.getElementById('selection-count');
  const dropzones = Array.from(document.querySelectorAll('.dropzone'));
  const placeholders = Array.from(document.querySelectorAll('.placeholder'));
  const searchInput = document.getElementById('search-input');
  const filterSelect = document.getElementById('filter-select');
  const galleryStatus = document.getElementById('gallery-status');
  const galleryLoading = document.getElementById('gallery-loading');
  const languageSelect = document.getElementById('language-select');
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  let draggedElement = null;
  let draggedFromPlaceholder = false;
  let placementSucceeded = false;
  let selectedCardsCount = 0;
  let contextMenu = null;
  let zoomOverlay = null;
  let currentLanguage = config.currentLanguage || 'en';

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
      selectionHint: 'Tap to add, drag to reorder, and keep scrolling the grid.',
      finalize: 'Finalize Selection',
      limitHint: 'Up to 6 cards',
      nextStep: 'Next step: after finalizing, you will see an overview to review or share your selected cards.',
      availableImages: 'Available Images',
      mobileHint: 'Tap a card to add it above',
      allLabels: 'All labels',
      searchPlaceholder: 'Search by card number or label',
      selectedSuffix: 'selected',
      cardsShown: 'cards shown',
      zoom: 'Zoom',
      zoomedCard: 'Zoomed card',
      removeCard: 'Remove card {id} from selection',
      saveError: 'Unable to save your selection. Please try again.'
    },
    nl: {
      selectionHeading: 'Jouw selectie',
      selectionHint: 'Tik om toe te voegen, sleep om te herschikken en blijf door het raster scrollen.',
      finalize: 'Selectie afronden',
      limitHint: 'Maximaal 6 kaarten',
      nextStep: 'Volgende stap: na het afronden zie je een overzicht om je kaarten te controleren of te delen.',
      availableImages: 'Beschikbare afbeeldingen',
      mobileHint: 'Tik op een kaart om die hierboven toe te voegen',
      allLabels: 'Alle labels',
      searchPlaceholder: 'Zoek op kaartnummer of label',
      selectedSuffix: 'geselecteerd',
      cardsShown: 'kaarten getoond',
      zoom: 'Vergroten',
      zoomedCard: 'Vergrote kaart',
      removeCard: 'Verwijder kaart {id} uit de selectie',
      saveError: 'Je selectie kon niet worden opgeslagen. Probeer het opnieuw.'
    },
    ro: {
      selectionHeading: 'Selectia ta',
      selectionHint: 'Atinge pentru a adauga, trage pentru a reordona si continua sa derulezi grila.',
      finalize: 'Finalizeaza selectia',
      limitHint: 'Pana la 6 carti',
      nextStep: 'Pasul urmator: dupa finalizare vei vedea o prezentare pentru a revizui sau partaja cartile selectate.',
      availableImages: 'Imagini disponibile',
      mobileHint: 'Atinge o carte pentru a o adauga mai sus',
      allLabels: 'Toate etichetele',
      searchPlaceholder: 'Cauta dupa numarul cartii sau eticheta',
      selectedSuffix: 'selectate',
      cardsShown: 'carti afisate',
      zoom: 'Mareste',
      zoomedCard: 'Carte marita',
      removeCard: 'Elimina cartea {id} din selectie',
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

  function getFirstEmptyDropzone() {
    return dropzones.find((zone) => zone.classList.contains('empty'));
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

  function createSelectedCard(sourceElement, dropzone) {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.dataset.id = sourceElement.dataset.id;

    const img = document.createElement('img');
    img.src = sourceElement.dataset.large;
    img.classList.add('large');
    card.appendChild(img);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.setAttribute('aria-label', interpolate('removeCard', { id: sourceElement.dataset.id }));
    removeBtn.addEventListener('click', () => {
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
    });
    card.appendChild(removeBtn);

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
    return true;
  }

  function handleCardSelection(cardElement) {
    if (!cardElement.closest('.placeholder')) {
      return;
    }
    const targetDropzone = getFirstEmptyDropzone();
    if (targetDropzone && placeCardInDropzone(cardElement, targetDropzone)) {
      placementSucceeded = true;
    }
  }

  function applyInwardZoomClass(cardElement) {
    if (!cardElement || cardElement.classList.contains('selected-in-gallery')) {
      return;
    }

    inwardZoomClasses.forEach((cssClass) => cardElement.classList.remove(cssClass));

    const rect = cardElement.getBoundingClientRect();
    const edgeThreshold = 150;
    const nearTop = rect.top < edgeThreshold;
    const nearBottom = window.innerHeight - rect.bottom < edgeThreshold;
    const nearLeft = rect.left < edgeThreshold;
    const nearRight = window.innerWidth - rect.right < edgeThreshold;

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
    if (!cardElement) {
      return null;
    }
    if (cardElement.dataset.large) {
      return cardElement.dataset.large;
    }
    const img = cardElement.querySelector('img.large, img.small, img');
    return img ? img.src : null;
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
    const visibleCards = Array.from(document.querySelectorAll('.placeholder:not(.hidden-by-filter) .card'));
    const currentIndex = visibleCards.indexOf(currentCard);
    if (currentIndex === -1) {
      return;
    }
    const columns = Math.max(1, Math.floor(document.querySelector('.card-wrapper').offsetWidth / 132));
    let nextIndex = currentIndex;
    if (key === 'ArrowRight') nextIndex = Math.min(visibleCards.length - 1, currentIndex + 1);
    if (key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);
    if (key === 'ArrowDown') nextIndex = Math.min(visibleCards.length - 1, currentIndex + columns);
    if (key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - columns);
    visibleCards[nextIndex]?.focus();
  }

  function bindCardInteractions(card) {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('mouseenter', () => applyInwardZoomClass(card));
    card.addEventListener('contextmenu', (event) => openCardContextMenu(event, card));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleCardSelection(card);
      }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        moveFocus(card, event.key);
      }
    });

    if (isTouchDevice) {
      card.addEventListener('click', () => handleCardSelection(card));
    }
  }

  function updateGalleryVisibility() {
    const term = (searchInput?.value || '').trim().toLowerCase();
    const selectedLabel = filterSelect?.value || 'all';
    let visible = 0;

    placeholders.forEach((slot) => {
      const matchesSearch = (slot.dataset.search || '').includes(term);
      const labelToken = `,${selectedLabel},`;
      const matchesLabel = selectedLabel === 'all' || (slot.dataset.labelIds || '').includes(labelToken);
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

    updateFinalizeButton();
    updateGalleryVisibility();
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

  searchInput?.addEventListener('input', updateGalleryVisibility);
  filterSelect?.addEventListener('change', updateGalleryVisibility);
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

  updateFinalizeButton();
  applyLanguage(currentLanguage);
}());
