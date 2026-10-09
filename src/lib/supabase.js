import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables.",
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      /*
       * Keep the user logged in between
       * app/browser/PWA launches.
       */
      persistSession: true,

      /*
       * Automatically refresh the auth token.
       */
      autoRefreshToken: true,

      /*
       * Store the auth session locally.
       */
      storage:
        typeof window !== "undefined"
          ? window.localStorage
          : undefined,

      /*
       * Allows Supabase to detect auth state
       * from the URL when required.
       */
      detectSessionInUrl: true,
    },
  },
);