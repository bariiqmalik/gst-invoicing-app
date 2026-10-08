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
let client = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    console.error('[Supabase] Failed to initialise client:', err.message);
  }
} else {
  console.info(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. ' +
    'Operating in standalone Express REST mode. Configure credentials in .env to activate Supabase OAuth & storage.'
  );
}

// Fallback auth & query handler when Supabase credentials are not yet configured in .env
const dummyAuth = {
  signInWithOAuth: async ({ provider } = {}) => {
    const error = new Error(
      `Supabase credentials not configured in .env. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable ${provider || 'GitHub'} OAuth.`
    );
    console.error('OAuth error:', error.message);
    return { data: null, error };
  },
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signOut: async () => ({ error: null }),
  getUser: async () => ({ data: { user: null }, error: null })
};

const createDummyQuery = () => {
  const queryObj = {
    select: () => queryObj,
    order: () => queryObj,
    limit: () => queryObj,
    eq: () => queryObj,
    neq: () => queryObj,
    gte: () => queryObj,
    lte: () => queryObj,
    in: () => queryObj,
    is: () => queryObj,
    range: () => queryObj,
    or: () => queryObj,
    filter: () => queryObj,
    match: () => queryObj,
    insert: () => queryObj,
    update: () => queryObj,
    delete: () => queryObj,
    maybeSingle: async () => ({ data: null, error: { message: 'Supabase credentials not configured in .env', code: 'PGRST205' } }),
    single: async () => ({ data: null, error: { message: 'Supabase credentials not configured in .env', code: 'PGRST205' } }),
    then: (resolve) => Promise.resolve({ data: null, error: { message: 'Supabase credentials not configured in .env', code: 'PGRST205' } }).then(resolve)
  };
  return queryObj;
};

export const isSupabaseConfigured = Boolean(client);

// Export real Supabase client when configured, or safe stub with auth helpers to prevent runtime crashes
export const supabase = client || {
  auth: dummyAuth,
  from: () => createDummyQuery()
};


