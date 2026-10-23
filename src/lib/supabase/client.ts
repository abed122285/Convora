import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-safe Supabase client initializer.
 * Only reads public/publishable keys; never exposes service_role secrets.
 */
export function getBrowserSupabaseClient(): {
  client: SupabaseClient | null;
  isConfigured: boolean;
} {
  const url =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_SUPABASE_URL ||
        import.meta.env?.NEXT_PUBLIC_SUPABASE_URL)) ||
    '';
  const anonKey =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
        import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) ||
    '';

  const isRealUrl =
    Boolean(url) &&
    url.startsWith('https://') &&
    !url.includes('your-project-ref.supabase.co');
  const isRealKey =
    Boolean(anonKey) &&
    anonKey.length > 20 &&
    !anonKey.includes('your-supabase-anon');

  if (!isRealUrl || !isRealKey) {
    return { client: null, isConfigured: false };
  }

  return {
    client: createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }),
    isConfigured: true,
  };
}
