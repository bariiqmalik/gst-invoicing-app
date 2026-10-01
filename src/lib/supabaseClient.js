import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Singleton Supabase browser client.
 * Exported as null when env vars are missing so the app still boots.
 * When null, dbService automatically uses the built-in Express REST API.
 * To use Supabase: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel → Project Settings → Environment Variables.
 */
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
  } catch (err) {
    console.error('[Supabase] Failed to initialise client:', err.message);
  }
} else {
  console.info(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. ' +
    'Operating in standalone Express REST mode.'
  );
}

export const isSupabaseConfigured = Boolean(supabase);
export { supabase };
