import { useCallback, useEffect, useState } from "react";

import { supabase } from "./lib/supabase";

import SplashScreen from "./pages/SplashScreen";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import AiraSetup from "./pages/AiraSetup";

import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Tasks from "./pages/Tasks";

const VALID_PAGES = ["home", "chat", "tasks"];

const PAGE_STORAGE_KEY = "aira_current_page";

function getSavedPage() {
  try {
    const savedPage = localStorage.getItem(PAGE_STORAGE_KEY);

    return VALID_PAGES.includes(savedPage) ? savedPage : "home";
  } catch {
    return "home";
  }
}

function savePage(page) {
  try {
    localStorage.setItem(PAGE_STORAGE_KEY, page);
  } catch (error) {
    console.error("[Aira] Could not save current page:", error);
  }
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  const [session, setSession] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);

  const [screen, setScreen] = useState("login");

  // Restore the last page instead of always starting at Home.
  const [currentPage, setCurrentPage] = useState(getSavedPage);

  const [assistantName, setAssistantName] = useState("Aira");

  /*
   * A small reference prevents unnecessary setup checks
   * for repeated authentication events from the same user.
   */
  const [setupUserId, setSetupUserId] = useState(null);

  /*
   * LOAD AIRA SETTINGS
   */
  const loadAiraSettings = useCallback(async (currentSession) => {
    if (!currentSession?.user?.id) {
      setAssistantName("Aira");
      return;
    }

    const { data, error } = await supabase
      .from("aira_settings")
      .select(
        "assistant_name, voice_id, voice_name, voice_provider, assistant_gender",
      )
      .eq("user_id", currentSession.user.id)
      .maybeSingle();

    if (error) {
      console.error("[Aira] Settings load error:", error);
      return;
    }

    setAssistantName(data?.assistant_name || "Aira");
  }, []);

  /*
   * CHECK SETUP
   *
   * Important:
   * - Do not reset the page if setup is already complete.
   * - Do not repeatedly show the setup-loading screen.
   */
  const checkUserSetup = useCallback(
    async (currentSession) => {
      const userId = currentSession?.user?.id;

      if (!userId) {
        setSetupLoading(false);
        setScreen("login");
        setSetupUserId(null);
        return;
      }

      setSetupLoading(true);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("setup_completed")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        const setupCompleted = data?.setup_completed === true;

        if (!setupCompleted) {
          setSetupUserId(userId);
          setScreen("setup");
          return;
        }

        await loadAiraSettings(currentSession);

        setSetupUserId(userId);
        setScreen("app");

        /*
         * Restore the saved page.
         *
         * Do not set currentPage("home") here.
         * The user may already be in Chat or Tasks.
         */
        setCurrentPage((previousPage) => {
          const page = VALID_PAGES.includes(previousPage)
            ? previousPage
            : getSavedPage();

          savePage(page);

          return page;
        });
      } catch (error) {
        console.error("[Aira] Setup check failed:", error);

        /*
         * Keep the existing screen and page when possible.
         * A temporary network error should not send the
         * user back to Home or erase their navigation.
         */
      } finally {
        setSetupLoading(false);
      }
    },
    [loadAiraSettings],
  );

  /*
   * AUTHENTICATION AND SESSION RESTORATION
   */
  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) return;

        const currentSession = data?.session ?? null;

        setSession(currentSession);

        if (currentSession) {
          await checkUserSetup(currentSession);
        } else {
          setScreen("login");
        }
      } catch (error) {
        console.error("[Aira] Session initialization failed:", error);

        if (mounted) {
          setSession(null);
          setScreen("login");
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    initializeSession();

    /*
     * AUTH STATE LISTENER
     *
     * Token refreshes should NOT reset navigation.
     * INITIAL_SESSION is handled by initializeSession().
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      console.log("[Aira] Auth event:", event);

      setSession(newSession);

      /*
       * Explicit logout or session expiration.
       */
      if (event === "SIGNED_OUT" || !newSession) {
        setAssistantName("Aira");
        setSetupUserId(null);
        setSetupLoading(false);

        setCurrentPage("home");

        try {
          localStorage.removeItem(PAGE_STORAGE_KEY);
        } catch (error) {
          console.error("[Aira] Could not clear saved page:", error);
        }

        setScreen("login");

        return;
      }

      /*
       * A new login requires a setup check.
       */
      if (event === "SIGNED_IN") {
        /*
         * Do not check setup again if this user's
         * authenticated app is already ready.
         */
        if (
          setupUserId === newSession.user.id &&
          screen === "app"
        ) {
          return;
        }

        /*
         * Run outside the auth callback so that
         * Supabase requests do not block auth processing.
         */
        setTimeout(() => {
          if (mounted) {
            checkUserSetup(newSession);
          }
        }, 0);

        return;
      }

      /*
       * TOKEN_REFRESHED and other session events:
       * update the session, but preserve the current page.
       */
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkUserSetup, screen, setupUserId]);

  /*
   * SPLASH SCREEN
   */
  function handleSplashComplete() {
    setShowSplash(false);
  }

  /*
   * LOGIN
   */
  function handleLogin(user) {
    console.log("[Aira] Login successful:", user);
  }

  /*
   * ACCOUNT CREATION
   */
  function handleAccountCreated(user) {
    console.log("[Aira] Account created:", user);
  }

  /*
   * SETUP COMPLETE
   */
  async function handleSetupComplete(result) {
    if (result?.goBack) {
      setScreen("login");
      return;
    }

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (currentSession) {
      setSession(currentSession);

      await loadAiraSettings(currentSession);

      setSetupUserId(currentSession.user.id);
    }

    /*
     * A completed first-time setup starts at Home.
     */
    setCurrentPage("home");
    savePage("home");

    setScreen("app");
  }

  /*
   * NAVIGATION
   */
  function navigateTo(page) {
    if (!VALID_PAGES.includes(page)) {
      console.warn("[Aira] Invalid navigation page:", page);
      return;
    }

    setCurrentPage(page);
    savePage(page);
  }

  /*
   * LOGOUT
   */
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[Aira] Logout failed:", error);
      return;
    }

    setSession(null);
    setAssistantName("Aira");
    setSetupUserId(null);
    setSetupLoading(false);

    setCurrentPage("home");

    try {
      localStorage.removeItem(PAGE_STORAGE_KEY);
    } catch (error) {
      console.error("[Aira] Could not clear saved page:", error);
    }

    setScreen("login");
  }

  /*
   * 1. SPLASH
   */
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  /*
   * 2. INITIAL AUTHENTICATION LOADING
   */
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center">
          <div className="mb-5 h-10 w-10 animate-pulse rounded-full bg-white/10 shadow-[0_0_40px_rgba(0,200,255,0.15)]" />

          <p className="text-sm text-white/40">
            Loading Aira...
          </p>
        </div>
      </div>
    );
  }

  /*
   * 3. SETUP LOADING
   *
   * Only show this when the authenticated user is not
   * already inside the ready application.
   */
  if (
    session &&
    setupLoading &&
    screen !== "app"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center">
          <div className="mb-5 h-10 w-10 animate-pulse rounded-full bg-white/10 shadow-[0_0_40px_rgba(0,200,255,0.15)]" />

          <p className="text-sm text-white/40">
            Preparing your Aira...
          </p>
        </div>
      </div>
    );
  }

  /*
   * 4. CREATE ACCOUNT
   */
  if (screen === "create-account" && !session) {
    return (
      <CreateAccount
        onLogin={() => setScreen("login")}
        onAccountCreated={handleAccountCreated}
      />
    );
  }

  /*
   * 5. LOGIN
   */
  if (!session) {
    return (
      <Login
        onCreateAccount={() => setScreen("create-account")}
        onLogin={handleLogin}
      />
    );
  }

  /*
   * 6. PERSONALIZATION SETUP
   */
  if (screen === "setup") {
    return (
      <AiraSetup
        session={session}
        onComplete={handleSetupComplete}
      />
    );
  }

  /*
   * 7. MAIN APP
   */
  if (screen === "app") {
    return (
      <div className="min-h-screen bg-black text-white">
        {currentPage === "home" && (
          <Home
            assistantName={assistantName}
            onNavigate={navigateTo}
            onOpenSettings={handleLogout}
          />
        )}

        {currentPage === "chat" && (
          <Chat
            assistantName={assistantName}
            onNavigate={navigateTo}
          />
        )}

        {currentPage === "tasks" && (
          <Tasks
            assistantName={assistantName}
            onNavigate={navigateTo}
          />
        )}
      </div>
    );
  }

  /*
   * 8. RECOVERY
   */
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <p className="mb-4 text-sm text-white/60">
          Preparing your Aira...
        </p>

        <button
          type="button"
          onClick={() => checkUserSetup(session)}
          className="rounded-full border border-white/10 px-5 py-3 text-sm hover:bg-white/10"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default App;