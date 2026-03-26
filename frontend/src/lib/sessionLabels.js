export function getAvailableSessionLabels(config, language = 'en') {
  const themeLabels = config?.themeLabels?.[language] || config?.themeLabels?.en || [];
  const rawCardLabels = config?.cardLabels || {};
  const counts = new Map();

  Object.values(rawCardLabels).forEach((labelIds) => {
    if (!Array.isArray(labelIds)) {
      return;
    }
    labelIds.forEach((labelId) => {
      const parsed = Number(labelId);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 6) {
        return;
      }
      counts.set(parsed, (counts.get(parsed) || 0) + 1);
    });
  });

  return themeLabels
    .map((label, index) => {
      const id = index + 1;
      const count = counts.get(id) || 0;
      if (!count) {
        return null;
      }
      return {
        id,
        label,
        count,
      };
    })
    .filter(Boolean);
}


export function getSessionLabelName(config, sessionLabelId, language = 'en') {
  const themeLabels = config?.themeLabels?.[language] || config?.themeLabels?.en || [];
  const index = Number(sessionLabelId) - 1;
  if (index >= 0 && index < themeLabels.length) {
    return themeLabels[index];
  }
  return Number.isInteger(Number(sessionLabelId)) && Number(sessionLabelId) > 0 ? `Label ${Number(sessionLabelId)}` : '';
}
