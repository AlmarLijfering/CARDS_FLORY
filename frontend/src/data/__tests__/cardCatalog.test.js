import { describe, expect, it } from 'vitest';
import { cardCatalog } from '../cardCatalog';
import { TOTAL_CARD_COUNT } from '../../lib/constants';


describe('cardCatalog', () => {
  it('contains exactly TOTAL_CARD_COUNT cards', () => {
    expect(cardCatalog).toHaveLength(TOTAL_CARD_COUNT);
  });

  it('cards have sequential ids starting from 1', () => {
    cardCatalog.forEach((card, index) => {
      expect(card.id).toBe(index + 1);
    });
  });

  it('each card has required fields', () => {
    for (const card of cardCatalog) {
      expect(card).toHaveProperty('id');
      expect(card).toHaveProperty('title');
      expect(card).toHaveProperty('smallImage');
      expect(card).toHaveProperty('largeImage');
    }
  });

  it('image paths follow the expected pattern', () => {
    const first = cardCatalog[0];
    expect(first.smallImage).toBe('/cards/cards_s001.png');
    expect(first.largeImage).toBe('/cards/cards_l001.png');

    const last = cardCatalog[TOTAL_CARD_COUNT - 1];
    const padded = String(TOTAL_CARD_COUNT).padStart(3, '0');
    expect(last.smallImage).toBe(`/cards/cards_s${padded}.png`);
    expect(last.largeImage).toBe(`/cards/cards_l${padded}.png`);
  });

  it('card titles follow the Card NNN pattern', () => {
    expect(cardCatalog[0].title).toBe('Card 001');
    expect(cardCatalog[9].title).toBe('Card 010');
    expect(cardCatalog[99].title).toBe('Card 100');
  });

  it('has no duplicate ids', () => {
    const ids = cardCatalog.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
