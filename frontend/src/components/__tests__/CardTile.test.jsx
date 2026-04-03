import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { CardTile } from '../CardTile';


const MOCK_CARD = {
  id: 7,
  title: 'Card 007',
  smallImage: '/cards/cards_s007.png',
  largeImage: '/cards/cards_l007.png',
};

function renderCardTile(overrides = {}) {
  const defaultProps = {
    card: MOCK_CARD,
    isActive: false,
    isSelected: false,
    selectedLabel: '',
    onActivate: vi.fn(),
    onAdd: vi.fn(),
    onOpenMenu: vi.fn(),
    onKeyDown: vi.fn(),
    ...overrides,
  };

  return render(
    <DndContext>
      <CardTile {...defaultProps} />
    </DndContext>
  );
}


describe('CardTile', () => {
  it('renders the card image', () => {
    renderCardTile();
    const img = screen.getByAltText('Card 007');
    expect(img).toHaveAttribute('src', MOCK_CARD.smallImage);
  });

  it('shows the card id badge', () => {
    renderCardTile();
    expect(screen.getByText('#7')).toBeInTheDocument();
  });

  it('renders as a gridcell', () => {
    renderCardTile();
    expect(screen.getByRole('gridcell')).toBeInTheDocument();
  });

  it('sets aria-selected based on isActive', () => {
    renderCardTile({ isActive: true });
    expect(screen.getByRole('gridcell')).toHaveAttribute('aria-selected', 'true');
  });

  it('marks button as aria-disabled when selected', () => {
    renderCardTile({ isSelected: true });
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows selected label when card is selected', () => {
    renderCardTile({ isSelected: true, selectedLabel: 'Slot 3' });
    expect(screen.getByText('Slot 3')).toBeInTheDocument();
  });

  it('calls onActivate on click', () => {
    const onActivate = vi.fn();
    renderCardTile({ onActivate });
    fireEvent.click(screen.getByRole('button'));
    expect(onActivate).toHaveBeenCalledWith(7);
  });

  it('calls onAdd on double click', () => {
    const onAdd = vi.fn();
    renderCardTile({ onAdd });
    fireEvent.doubleClick(screen.getByRole('button'));
    expect(onAdd).toHaveBeenCalledWith(7, 'pointer');
  });

  it('calls onKeyDown on keyDown', () => {
    const onKeyDown = vi.fn();
    renderCardTile({ onKeyDown, isActive: true });
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalled();
  });

  it('calls onOpenMenu on context menu', () => {
    const onOpenMenu = vi.fn();
    renderCardTile({ onOpenMenu });
    fireEvent.contextMenu(screen.getByRole('button'));
    expect(onOpenMenu).toHaveBeenCalled();
  });

  it('active card is focusable (tabIndex 0)', () => {
    renderCardTile({ isActive: true });
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
  });

  it('inactive card is not focusable (tabIndex -1)', () => {
    renderCardTile({ isActive: false });
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1');
  });

  it('uses lazy loading for the image', () => {
    renderCardTile();
    expect(screen.getByAltText('Card 007')).toHaveAttribute('loading', 'lazy');
  });
});
