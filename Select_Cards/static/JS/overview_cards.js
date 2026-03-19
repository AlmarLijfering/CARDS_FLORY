(function () {
  const config = window.overviewCardsConfig || {};
  const routes = config.routes || {};
  let currentLanguage = config.currentLanguage || 'en';

  const translations = {
    en: {
      overviewHeading: 'Overview of Selected Cards',
      overviewHint: 'Confirm the order below before printing or sharing.',
      editSelection: 'Edit Selection',
      printPdf: 'Print to PDF',
      noCardsSelected: 'No cards selected.',
      pageLabel: 'Page',
      pdfName: 'selected_cards.pdf'
    },
    nl: {
      overviewHeading: 'Overzicht van geselecteerde kaarten',
      overviewHint: 'Controleer hieronder de volgorde voordat je afdrukt of deelt.',
      editSelection: 'Selectie bewerken',
      printPdf: 'Afdrukken naar pdf',
      noCardsSelected: 'Geen kaarten geselecteerd.',
      pageLabel: 'Pagina',
      pdfName: 'geselecteerde_kaarten.pdf'
    },
    ro: {
      overviewHeading: 'Prezentare generala a cartilor selectate',
      overviewHint: 'Confirma ordinea de mai jos inainte de tiparire sau partajare.',
      editSelection: 'Editeaza selectia',
      printPdf: 'Tipareste in PDF',
      noCardsSelected: 'Nu exista carti selectate.',
      pageLabel: 'Pagina',
      pdfName: 'carti_selectate.pdf'
    }
  };

  function t(key) {
    const dict = translations[currentLanguage] || translations.en;
    return dict[key] || translations.en[key] || key;
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
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  function imageToSquareDataUrl(imageObj, sizePx = 1024, mode = 'contain', background = '#FFFFFF') {
    const canvas = document.createElement('canvas');
    canvas.width = sizePx;
    canvas.height = sizePx;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, sizePx, sizePx);

    const imageWidth = imageObj.naturalWidth || imageObj.width;
    const imageHeight = imageObj.naturalHeight || imageObj.height;
    const scaleContain = Math.min(sizePx / imageWidth, sizePx / imageHeight);
    const scaleCover = Math.max(sizePx / imageWidth, sizePx / imageHeight);
    const scale = mode === 'cover' ? scaleCover : scaleContain;

    const drawWidth = Math.round(imageWidth * scale);
    const drawHeight = Math.round(imageHeight * scale);
    const offsetX = Math.round((sizePx - drawWidth) / 2);
    const offsetY = Math.round((sizePx - drawHeight) / 2);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imageObj, offsetX, offsetY, drawWidth, drawHeight);

    return canvas.toDataURL('image/png');
  }

  async function printToPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const domImages = Array.from(document.querySelectorAll('#card-container .card img'));
    const sources = domImages.map((img) => img.currentSrc || img.src).filter(Boolean);

    if (sources.length === 0) {
      window.alert(t('noCardsSelected'));
      return;
    }

    const cols = 2;
    const rows = 3;
    const perPage = cols * rows;
    const margin = 10;
    const gap = 6;
    const top = 18;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const cellWidth = (pageWidth - margin * 2 - gap * (cols - 1)) / cols;
    const cellHeight = (pageHeight - top - margin - gap * (rows - 1)) / rows;
    const sideMm = Math.min(cellWidth, cellHeight);

    const drawHeader = (pageIndex) => {
      doc.setFontSize(14);
      doc.text(t('overviewHeading'), margin, 12);
      doc.setFontSize(10);
      doc.text(`${t('pageLabel')} ${pageIndex}`, pageWidth - margin, 12, { align: 'right' });
    };

    let pageIndex = 1;
    drawHeader(pageIndex);

    for (let index = 0; index < sources.length; index += 1) {
      if (index > 0 && index % perPage === 0) {
        doc.addPage();
        pageIndex += 1;
        drawHeader(pageIndex);
      }

      const indexOnPage = index % perPage;
      const row = Math.floor(indexOnPage / cols);
      const col = indexOnPage % cols;
      const x = margin + col * (sideMm + gap);
      const y = top + row * (sideMm + gap);

      const imgObj = await loadImage(sources[index]);
      const dataUrl = imageToSquareDataUrl(imgObj);
      doc.addImage(dataUrl, 'PNG', x, y, sideMm, sideMm);
    }

    doc.save(t('pdfName'));
  }

  document.getElementById('back-btn')?.addEventListener('click', () => {
    if (routes.selectCards) {
      window.location.href = routes.selectCards;
    }
  });

  document.getElementById('print-btn')?.addEventListener('click', printToPdf);

  applyLanguage(currentLanguage);
}());
