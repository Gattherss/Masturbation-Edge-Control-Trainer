import type { PublicProfile } from '@/types/models';
import { loadPublicProfile, savePublicProfile } from './storage';

export const DEFAULT_PUBLIC_PROFILE: PublicProfile = {
  displayName: 'New Forge',
  avatarSeed: 'forge-self',
  tagline: 'Build rhythm with evidence.',
  visibility: 'public',
  updatedAt: new Date().toISOString()
};

export function loadProfile(): PublicProfile {
  return loadPublicProfile(DEFAULT_PUBLIC_PROFILE);
}

export function persistProfile(profile: PublicProfile) {
  savePublicProfile({
    ...profile,
    updatedAt: new Date().toISOString()
  });
}

