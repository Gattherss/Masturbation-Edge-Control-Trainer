import { afterEach, describe, expect, it } from 'vitest';
import {
  buildLaterWelcomePromptState,
  getWelcomePromptState,
  shouldShowWelcomePrompt,
  WELCOME_PROMPT_VERSION,
  WELCOME_PROMPT_SNOOZE_MS
} from '@/lib/welcomePrompt';
import { saveWelcomePromptState } from '@/lib/storage';

afterEach(() => {
  saveWelcomePromptState(null);
});

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

describe('getWelcomePromptState', () => {
  it('drops remembered prompt choices from an older prompt version', () => {
    saveWelcomePromptState({
      mode: 'later',
      updatedAt: '2026-04-09T00:00:00.000Z',
      remindAfter: '2026-04-10T00:00:00.000Z',
      version: 'outdated-version'
    });

    expect(getWelcomePromptState()).toBeNull();
  });

  it('keeps the current prompt version intact', () => {
    saveWelcomePromptState({
      mode: 'guest',
      updatedAt: '2026-04-09T00:00:00.000Z',
      version: WELCOME_PROMPT_VERSION
    });

    expect(getWelcomePromptState()).toEqual({
      mode: 'guest',
      updatedAt: '2026-04-09T00:00:00.000Z',
      version: WELCOME_PROMPT_VERSION
    });
  });
});
