import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardPreviewModal } from '../CardPreviewModal';


const MOCK_CARD = {
  id: 42,
  title: 'Card 042',
  smallImage: '/cards/cards_s042.png',
  largeImage: '/cards/cards_l042.png',
};


describe('CardPreviewModal', () => {
  it('renders nothing when card is null', () => {
    const { container } = render(
      <CardPreviewModal card={null} title="Preview" closeLabel="Close" onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders a dialog when card is provided', () => {
    render(
      <CardPreviewModal card={MOCK_CARD} title="Card preview" closeLabel="Close" onClose={() => {}} />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Card preview');
  });

  it('displays the card image', () => {
    render(
      <CardPreviewModal card={MOCK_CARD} title="Preview" closeLabel="Close" onClose={() => {}} />
    );
    const img = screen.getByAltText('Card 042');
    expect(img).toHaveAttribute('src', MOCK_CARD.largeImage);
  });

  it('shows close button with provided label', () => {
    render(
      <CardPreviewModal card={MOCK_CARD} title="Preview" closeLabel="Close preview" onClose={() => {}} />
    );
    expect(screen.getByText('Close preview')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <CardPreviewModal card={MOCK_CARD} title="Preview" closeLabel="Close" onClose={onClose} />
    );
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(
      <CardPreviewModal card={MOCK_CARD} title="Preview" closeLabel="Close" onClose={onClose} />
    );
    // Click the outer backdrop (the fixed overlay)
    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when dialog content clicked', () => {
    const onClose = vi.fn();
    render(
      <CardPreviewModal card={MOCK_CARD} title="Preview" closeLabel="Close" onClose={onClose} />
    );
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <CardPreviewModal card={MOCK_CARD} title="Preview" closeLabel="Close" onClose={onClose} />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows selected label badge when provided', () => {
    render(
      <CardPreviewModal card={MOCK_CARD} title="Preview" closeLabel="Close" selectedLabel="Slot 2" onClose={() => {}} />
    );
    expect(screen.getByText('Slot 2')).toBeInTheDocument();
  });

  it('hides selected label badge when not provided', () => {
    render(
      <CardPreviewModal card={MOCK_CARD} title="Preview" closeLabel="Close" onClose={() => {}} />
    );
    expect(screen.queryByText('Slot')).toBeNull();
  });
});
