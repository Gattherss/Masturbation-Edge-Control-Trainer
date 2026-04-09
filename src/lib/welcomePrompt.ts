import type { WelcomePromptState } from '@/types/models';
import { loadWelcomePromptState, saveWelcomePromptState } from './storage';

export const WELCOME_PROMPT_SNOOZE_MS = 24 * 60 * 60 * 1000;

export function getWelcomePromptState() {
  return loadWelcomePromptState();
}

export function persistWelcomePromptState(state: WelcomePromptState | null) {
  saveWelcomePromptState(state);
}

export function buildGuestWelcomePromptState(now = new Date()): WelcomePromptState {
  return {
    mode: 'guest',
    updatedAt: now.toISOString()
  };
}

export function buildLaterWelcomePromptState(
  remindAfterMs = WELCOME_PROMPT_SNOOZE_MS,
  now = new Date()
): WelcomePromptState {
  return {
    mode: 'later',
    updatedAt: now.toISOString(),
    remindAfter: new Date(now.getTime() + remindAfterMs).toISOString()
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
