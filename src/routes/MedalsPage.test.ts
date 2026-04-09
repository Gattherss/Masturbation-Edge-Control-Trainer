import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MedalsPage from './MedalsPage';
import type { MedalUnlock, Session } from '@/types/models';

describe('MedalsPage', () => {
  it('renders safely even when persisted medals contain legacy or malformed entries', () => {
    const sessions: Session[] = [];
    const medals = [
      null,
      { code: 'unknown_medal', unlockedAt: '2026-04-01T00:00:00.000Z' },
      { code: 'rhythm_black_iron', unlockedAt: '2026-04-08T00:00:00.000Z' },
      { code: 'control_black_iron', unlockedAt: 'bad-date', family: 'legacy-control' }
    ] as unknown as MedalUnlock[];

    render(React.createElement(MedalsPage, { sessions, medals }));

    expect(screen.getByRole('heading', { name: '勋章墙' })).toBeInTheDocument();
    expect(screen.getByText('黑铁节律章')).toBeInTheDocument();
    expect(screen.getByText('黑铁控稳章')).toBeInTheDocument();
  });
});
