export function buildThemeCoverage(selectedCards, cardLabels, themeLabels, language) {
  const labels = themeLabels[language] || themeLabels.en;
  const counts = labels.map((label) => ({ label, value: 0 }));

  selectedCards.forEach((cardId) => {
    const assignedLabels = cardLabels[String(cardId)] || [];
    assignedLabels.forEach((labelId) => {
      if (counts[labelId - 1]) {
        counts[labelId - 1].value += 1;
      }
    });
  });

  const nonZero = counts.filter((item) => item.value > 0);
  if (nonZero.length) {
    return nonZero;
  }

  return [
    {
      label: 'Selected cards',
      value: selectedCards.length
    }
  ];
}


export function buildSelectionOrderSeries(selectedCards) {
  return selectedCards.map((cardId, index) => ({
    label: `Slot ${index + 1}`,
    value: cardId
  }));
}


export function buildPdfPayload({
  selectedCards,
  cardCatalog,
  cardLabels,
  themeLabels,
  language,
  sessionContext
}) {
  const catalogById = Object.fromEntries(cardCatalog.map((card) => [card.id, card]));
  const themeCoverage = buildThemeCoverage(selectedCards, cardLabels, themeLabels, language);
  const orderSeries = buildSelectionOrderSeries(selectedCards);

  return {
    context: {
      session_title: sessionContext.sessionTitle,
      facilitator: sessionContext.facilitator,
      client_alias: sessionContext.clientAlias,
      notes: sessionContext.notes,
      language
    },
    selected_cards: selectedCards.map((cardId, index) => {
      const card = catalogById[cardId];
      const labels = (cardLabels[String(cardId)] || [])
        .map((labelId) => (themeLabels[language] || themeLabels.en)[labelId - 1])
        .filter(Boolean);

      return {
        id: cardId,
        title: card?.title || `Card ${String(cardId).padStart(3, '0')}`,
        labels,
        summary: `Final slot ${index + 1}`
      };
    }),
    graphs: [
      {
        title: 'Theme coverage',
        description: 'How the selected cards map to the configured theme labels.',
        data: themeCoverage
      },
      {
        title: 'Selection order',
        description: 'The final order of cards in the selected workspace.',
        data: orderSeries
      }
    ]
  };
}
