import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Check your .env file. Supabase operations will fail.'
  );
}

/**
 * Singleton Supabase browser client.
 * Uses the anon/publishable key — safe for client-side use.
 * Row-Level Security (RLS) on each table enforces data isolation.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // We manage our own JWT auth via the Express backend.
    // Disable Supabase Auth listeners to avoid conflicts.
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});
