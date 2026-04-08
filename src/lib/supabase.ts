import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null | undefined;

export interface SupabaseEnvInfo {
  url: string | undefined;
  anonKey: string | undefined;
  enabled: boolean;
  missingKeys: string[];
  projectHost: string | null;
}

export function getSupabaseEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const missingKeys: string[] = [];

  if (!url) {
    missingKeys.push('VITE_SUPABASE_URL');
  }

  if (!anonKey) {
    missingKeys.push('VITE_SUPABASE_ANON_KEY');
  }

  let projectHost: string | null = null;
  if (url) {
    try {
      projectHost = new URL(url).host;
    } catch {
      projectHost = url;
    }
  }

  const info: SupabaseEnvInfo = {
    url,
    anonKey,
    enabled: missingKeys.length === 0,
    missingKeys,
    projectHost
  };

  return info;
}

export function getSupabaseClient(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env.enabled || !env.url || !env.anonKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.url, env.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return supabaseClient;
}
