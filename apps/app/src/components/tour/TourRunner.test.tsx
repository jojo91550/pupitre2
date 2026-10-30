import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { TourStep } from '@/lib/tour-steps';

import { TourRunner } from './TourRunner';

// jsdom lays nothing out: every target has an empty box, so a step either
// falls back to a centred bubble or, when optional, is skipped.

const STEPS: TourStep[] = [
  { id: 'one', targets: ['one'], title: 'Un', text: 'Premier' },
  { id: 'two', targets: ['two'], optional: true, title: 'Deux', text: 'Deuxième' },
  { id: 'three', title: 'Trois', text: 'Troisième' },
];

function renderTour(onEnd = vi.fn()) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <button>Avant</button>
            <span data-tour="one">cible</span>
            <span data-tour="two">cachée</span>
            <TourRunner steps={STEPS} onEnd={onEnd} />
          </>
        ),
      },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
  return onEnd;
}

const key = (name: string) => act(() => void fireEvent.keyDown(document, { key: name }));

describe('tour runner (spec 007)', () => {
  it('goes forward and back with the keyboard, skipping a hidden optional step', async () => {
    const onEnd = renderTour();
    expect(await screen.findByText('Un')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suivant' })).toHaveFocus();

    key('ArrowRight');
    expect(await screen.findByText('Trois')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    key('ArrowLeft');
    expect(await screen.findByText('Un')).toBeInTheDocument();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('ends with Escape before the last step', async () => {
    const onEnd = renderTour();
    await screen.findByText('Un');
    key('Escape');
    expect(onEnd).toHaveBeenCalledWith(false);
  });

  it('completes on « Terminer »', async () => {
    const onEnd = renderTour();
    await screen.findByText('Un');
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Terminer' }));
    expect(onEnd).toHaveBeenCalledWith(true);
    expect(screen.queryByText('Passer la visite')).toBeNull();
  });

  it('announces each step', async () => {
    renderTour();
    expect(await screen.findByText('Étape 1 sur 3 : Un')).toBeInTheDocument();
  });
});
