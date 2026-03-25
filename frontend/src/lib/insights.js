export function buildPdfPayload({
  selectedCards,
  cardCatalog,
  cardLabels,
  themeLabels,
  language,
  sessionContext,
  sessionKey
}) {
  const catalogById = Object.fromEntries(cardCatalog.map((card) => [card.id, card]));
  const fallbackTitle = sessionKey && sessionKey !== 'default' ? `Session ${sessionKey}` : '';

  return {
    context: {
      session_title: sessionContext.sessionTitle || fallbackTitle,
      facilitator: sessionContext.facilitator,
      client_alias: sessionContext.clientAlias,
      notes: sessionContext.notes,
      language
    },
    selected_cards: selectedCards.map((cardId) => {
      const card = catalogById[cardId];
      const labels = (cardLabels[String(cardId)] || [])
        .map((labelId) => (themeLabels[language] || themeLabels.en)[labelId - 1])
        .filter(Boolean);

      return {
        id: cardId,
        title: card?.title || `Card ${String(cardId).padStart(3, '0')}`,
        labels
      };
    }),
    graphs: []
  };
}
