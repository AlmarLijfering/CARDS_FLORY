import { TOTAL_CARD_COUNT } from '../lib/constants';

export const cardCatalog = Array.from({ length: TOTAL_CARD_COUNT }, (_, index) => {
  const id = index + 1;
  const padded = String(id).padStart(3, '0');
  return {
    id,
    title: `Card ${padded}`,
    smallImage: `/cards/cards_s${padded}.png`,
    largeImage: `/cards/cards_l${padded}.png`
  };
});

