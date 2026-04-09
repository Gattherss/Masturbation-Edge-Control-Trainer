import { describe, expect, it } from 'vitest';
import {
  buildLaterWelcomePromptState,
  shouldShowWelcomePrompt,
  WELCOME_PROMPT_SNOOZE_MS
} from '@/lib/welcomePrompt';

describe('shouldShowWelcomePrompt', () => {
  it('shows the prompt when no previous choice exists', () => {
    expect(shouldShowWelcomePrompt(null, new Date('2026-04-09T00:00:00.000Z'))).toBe(true);
  });

  it('keeps the prompt hidden after choosing guest mode', () => {
    expect(
      shouldShowWelcomePrompt(
        {
          mode: 'guest',
          updatedAt: '2026-04-09T00:00:00.000Z'
        },
        new Date('2026-04-10T00:00:00.000Z')
      )
    ).toBe(false);
  });

  it('reopens the prompt after the later snooze expires', () => {
    const current = new Date('2026-04-09T00:00:00.000Z');
    const laterState = buildLaterWelcomePromptState(WELCOME_PROMPT_SNOOZE_MS, current);

    expect(shouldShowWelcomePrompt(laterState, new Date('2026-04-09T12:00:00.000Z'))).toBe(false);
    expect(shouldShowWelcomePrompt(laterState, new Date('2026-04-10T00:00:00.000Z'))).toBe(true);
  });
});
