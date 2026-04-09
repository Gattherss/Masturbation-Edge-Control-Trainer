import type { WelcomePromptState } from '@/types/models';
import { loadWelcomePromptState, saveWelcomePromptState } from './storage';

export const WELCOME_PROMPT_SNOOZE_MS = 24 * 60 * 60 * 1000;
export const WELCOME_PROMPT_VERSION = '2026-04-09-mobile-v2';

export function getWelcomePromptState() {
  const state = loadWelcomePromptState();
  if (!state) {
    return null;
  }

  return state.version === WELCOME_PROMPT_VERSION ? state : null;
}

export function persistWelcomePromptState(state: WelcomePromptState | null) {
  saveWelcomePromptState(state);
}

export function buildGuestWelcomePromptState(now = new Date()): WelcomePromptState {
  return {
    mode: 'guest',
    updatedAt: now.toISOString(),
    version: WELCOME_PROMPT_VERSION
  };
}

export function buildLaterWelcomePromptState(
  remindAfterMs = WELCOME_PROMPT_SNOOZE_MS,
  now = new Date()
): WelcomePromptState {
  return {
    mode: 'later',
    updatedAt: now.toISOString(),
    remindAfter: new Date(now.getTime() + remindAfterMs).toISOString(),
    version: WELCOME_PROMPT_VERSION
  };
}

export function shouldShowWelcomePrompt(state: WelcomePromptState | null, now = new Date()) {
  if (!state) {
    return true;
  }

  if (state.mode === 'guest') {
    return false;
  }

  if (!state.remindAfter) {
    return true;
  }

  const remindAt = Date.parse(state.remindAfter);
  if (!Number.isFinite(remindAt)) {
    return true;
  }

  return now.getTime() >= remindAt;
}
