import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { EmptySelectionSlot, SelectedCardSlot } from '../SelectedCardSlot';


const LABELS = {
  slotPrefix: 'Slot',
  emptySlotHint: 'Drop or click to fill',
};

const MOCK_CARD = {
  id: 42,
  title: 'Card 042',
  smallImage: '/cards/cards_s042.png',
  largeImage: '/cards/cards_l042.png',
};


function renderEmpty(overrides = {}) {
  const defaultProps = {
    index: 0,
    labels: LABELS,
    isActive: false,
    onActivate: vi.fn(),
    onKeyDown: vi.fn(),
    ...overrides,
  };
  return render(
    <DndContext>
      <EmptySelectionSlot {...defaultProps} />
    </DndContext>
  );
}

function renderFilled(overrides = {}) {
  const defaultProps = {
    card: MOCK_CARD,
    index: 2,
    removeLabel: 'Remove card',
    isActive: false,
    onActivate: vi.fn(),
    onKeyDown: vi.fn(),
    onOpenMenu: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  return render(
    <DndContext>
      <SelectedCardSlot {...defaultProps} />
    </DndContext>
  );
}


describe('EmptySelectionSlot', () => {
  it('renders slot number and hint', () => {
    renderEmpty({ index: 0 });
    expect(screen.getByText('Slot 1')).toBeInTheDocument();
    expect(screen.getByText('Drop or click to fill')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    renderEmpty({ index: 2 });
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Slot 3');
  });

  it('active slot is focusable', () => {
    renderEmpty({ isActive: true });
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
  });

  it('inactive slot is not focusable', () => {
    renderEmpty({ isActive: false });
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1');
  });

  it('calls onActivate on click', () => {
    const onActivate = vi.fn();
    renderEmpty({ onActivate });
    fireEvent.click(screen.getByRole('button'));
    expect(onActivate).toHaveBeenCalled();
  });

  it('calls onKeyDown on key press', () => {
    const onKeyDown = vi.fn();
    renderEmpty({ onKeyDown, isActive: true });
    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowRight' });
    expect(onKeyDown).toHaveBeenCalled();
  });

  it('marks empty slot with data attribute', () => {
    renderEmpty();
    expect(screen.getByRole('button')).toHaveAttribute('data-has-card', 'false');
  });
});


describe('SelectedCardSlot', () => {
  it('renders the card image', () => {
    renderFilled();
    const img = screen.getByAltText('Card 042');
    expect(img).toHaveAttribute('src', MOCK_CARD.largeImage);
  });

  it('shows card id badge', () => {
    renderFilled();
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('shows slot number badge (1-indexed)', () => {
    renderFilled({ index: 2 });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('has remove button with accessible label', () => {
    renderFilled();
    const removeBtn = screen.getByLabelText('Remove card 42');
    expect(removeBtn).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', () => {
    const onRemove = vi.fn();
    renderFilled({ onRemove });
    fireEvent.click(screen.getByLabelText('Remove card 42'));
    expect(onRemove).toHaveBeenCalledWith(42);
  });

  it('marks filled slot with data attribute', () => {
    const { container } = renderFilled();
    const slot = container.querySelector('[data-slot-index="2"]');
    expect(slot).toHaveAttribute('data-has-card', 'true');
  });

  it('active slot is focusable', () => {
    const { container } = renderFilled({ isActive: true });
    const slot = container.querySelector('[data-slot-index="2"]');
    expect(slot).toHaveAttribute('tabindex', '0');
  });
});
