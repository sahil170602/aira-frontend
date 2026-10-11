import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "./lib/supabase";

import SplashScreen from "./pages/SplashScreen";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import AiraSetup from "./pages/AiraSetup";

import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Tasks from "./pages/Tasks";

const SplashScreenComponent = SplashScreen?.default || SplashScreen;
const LoginComponent = Login?.default || Login;
const CreateAccountComponent =
  CreateAccount?.default || CreateAccount;
const AiraSetupComponent = AiraSetup?.default || AiraSetup;
const HomeComponent = Home?.default || Home;
const ChatComponent = Chat?.default || Chat;
const TasksComponent = Tasks?.default || Tasks;

const VALID_PAGES = ["home", "chat", "tasks"];

const PAGE_STORAGE_KEY = "aira_current_page";
const SPLASH_STORAGE_KEY = "aira_splash_completed";

function getSavedPage() {
  try {
    const savedPage = localStorage.getItem(PAGE_STORAGE_KEY);

    return VALID_PAGES.includes(savedPage)
      ? savedPage
      : "home";
  } catch {
    return "home";
  }
}

function savePage(page) {
  try {
    localStorage.setItem(PAGE_STORAGE_KEY, page);
  } catch (error) {
    console.error(
      "[Aira] Could not save current page:",
      error
    );
  }
}

function hasCompletedSplash() {
  try {
    return localStorage.getItem(SPLASH_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveSplashCompleted() {
  try {
    localStorage.setItem(SPLASH_STORAGE_KEY, "true");
  } catch (error) {
    console.error(
      "[Aira] Could not save splash state:",
      error
    );
  }
}

function normalizeGender(value) {
  if (typeof value !== "string") {
    return "";
  }

  const gender = value.trim().toLowerCase();

  if (
    gender === "female" ||
    gender === "woman" ||
    gender === "girl"
  ) {
    return "female";
  }

  if (
    gender === "male" ||
    gender === "man" ||
    gender === "boy"
  ) {
    return "male";
  }

  return "";
}

function App() {
  /*
   * Do not repeatedly show the splash screen after an ordinary
   * page reload or when the PWA is restored.
   *
   * To show it again for testing, remove the
   * aira_splash_completed item from localStorage.
   */
  const [showSplash, setShowSplash] = useState(
    () => !hasCompletedSplash()
  );

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);

  const [screen, setScreen] = useState("login");
  const [currentPage, setCurrentPage] = useState(getSavedPage);

  const [assistantName, setAssistantName] = useState("");
  const [assistantGender, setAssistantGender] = useState("");

  const [assistantSettingsLoading, setAssistantSettingsLoading] =
    useState(false);

  const [setupUserId, setSetupUserId] = useState(null);

  const mountedRef = useRef(false);
  const screenRef = useRef(screen);
  const setupUserIdRef = useRef(setupUserId);
  const settingsRequestRef = useRef(0);
  const currentUserIdRef = useRef(null);
  const resumeRefreshRef = useRef(false);

  /*
   * Keep refs synchronized with the current state.
   */
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    setupUserIdRef.current = setupUserId;
  }, [setupUserId]);

  /*
   * SAVE THE CURRENT PAGE.
   *
   * This lets Aira restore Home, Chat, or Tasks after a reload.
   */
  useEffect(() => {
    if (screen === "app") {
      savePage(currentPage);
    }
  }, [currentPage, screen]);

  /*
   * LOAD PERSONAL ASSISTANT SETTINGS.
   *
   * Settings are loaded for the currently authenticated user.
   * Older requests are ignored if a newer request starts.
   */
  const loadAiraSettings = useCallback(async (currentSession) => {
    const userId = currentSession?.user?.id;
    const requestId = ++settingsRequestRef.current;

    if (!userId) {
      setAssistantName("");
      setAssistantGender("");
      setAssistantSettingsLoading(false);

      return null;
    }

    setAssistantSettingsLoading(true);

    try {
      const { data, error } = await supabase
        .from("aira_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (
        !mountedRef.current ||
        requestId !== settingsRequestRef.current
      ) {
        return null;
      }

      if (error) {
        console.error(
          "[Aira] Could not load settings:",
          error
        );

        return null;
      }

      if (!data) {
        console.warn(
          "[Aira] No aira_settings row found for user:",
          userId
        );

        setAssistantName("");
        setAssistantGender("");

        return null;
      }

      const name = (
        data.assistant_name ||
        data.ai_name ||
        ""
      ).trim();

      const gender = normalizeGender(
        data.assistant_gender ||
        data.ai_gender ||
        ""
      );

      console.log("[Aira] Settings loaded:", {
        userId,
        assistantName: name,
        assistantGender: gender,
      });

      setAssistantName(name);
      setAssistantGender(gender);

      return {
        ...data,
        assistant_name: name,
        assistant_gender: gender,
      };
    } catch (error) {
      console.error(
        "[Aira] Settings loading failed:",
        error
      );

      return null;
    } finally {
      if (
        mountedRef.current &&
        requestId === settingsRequestRef.current
      ) {
        setAssistantSettingsLoading(false);
      }
    }
  }, []);

  /*
   * CHECK WHETHER SETUP IS COMPLETE.
   */
  const checkUserSetup = useCallback(
    async (currentSession) => {
      const userId = currentSession?.user?.id;

      if (!userId) {
        setSetupLoading(false);
        setSetupUserId(null);
        setAssistantName("");
        setAssistantGender("");
        setScreen("login");

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

        if (!mountedRef.current) {
          return;
        }

        const setupCompleted =
          data?.setup_completed === true;

        if (!setupCompleted) {
          setSetupUserId(userId);
          setScreen("setup");

          return;
        }

        await loadAiraSettings(currentSession);

        if (!mountedRef.current) {
          return;
        }

        setSetupUserId(userId);
        setScreen("app");

        setCurrentPage((previousPage) => {
          const page = VALID_PAGES.includes(previousPage)
            ? previousPage
            : "home";

          savePage(page);

          return page;
        });
      } catch (error) {
        console.error(
          "[Aira] Setup check failed:",
          error
        );

        if (mountedRef.current) {
          setScreen("login");
        }
      } finally {
        if (mountedRef.current) {
          setSetupLoading(false);
        }
      }
    },
    [loadAiraSettings]
  );

  /*
   * INITIAL AUTHENTICATION.
   *
   * Supabase restores its saved session here.
   */
  useEffect(() => {
    mountedRef.current = true;

    let active = true;

    async function initializeSession() {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!active || !mountedRef.current) {
          return;
        }

        setSession(currentSession);
        currentUserIdRef.current =
          currentSession?.user?.id || null;

        if (currentSession) {
          await checkUserSetup(currentSession);
        } else {
          setScreen((currentScreen) =>
            currentScreen === "create-account"
              ? currentScreen
              : "login"
          );
        }
      } catch (error) {
        console.error(
          "[Aira] Session initialization failed:",
          error
        );

        if (active && mountedRef.current) {
          setSession(null);
          currentUserIdRef.current = null;
          setAssistantName("");
          setAssistantGender("");

          setScreen((currentScreen) =>
            currentScreen === "create-account"
              ? currentScreen
              : "login"
          );
        }
      } finally {
        if (active && mountedRef.current) {
          setAuthLoading(false);
        }
      }
    }

    void initializeSession();

    /*
     * AUTH STATE LISTENER.
     *
     * TOKEN_REFRESHED must not reset the current page.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mountedRef.current) {
          return;
        }

        console.log("[Aira] Auth event:", event);

        if (event === "SIGNED_OUT") {
          settingsRequestRef.current += 1;

          currentUserIdRef.current = null;

          setSession(null);
          setAssistantName("");
          setAssistantGender("");
          setAssistantSettingsLoading(false);
          setSetupUserId(null);
          setSetupLoading(false);
          setCurrentPage("home");
          setScreen("login");

          try {
            localStorage.removeItem(PAGE_STORAGE_KEY);
          } catch (error) {
            console.error(
              "[Aira] Could not clear saved page:",
              error
            );
          }

          return;
        }

        if (!newSession) {
          return;
        }

        const newUserId = newSession.user?.id;

        const previousUserId = currentUserIdRef.current;

        currentUserIdRef.current = newUserId;
        setSession(newSession);

        /*
         * Refreshing the access token is normal.
         * Do not navigate or reload the app for it.
         */
        if (event === "TOKEN_REFRESHED") {
          return;
        }

        /*
         * Restore or refresh state only when a user actually signs in.
         */
        if (event === "SIGNED_IN") {
          if (
            previousUserId === newUserId &&
            setupUserIdRef.current === newUserId &&
            screenRef.current === "app"
          ) {
            void loadAiraSettings(newSession);
            return;
          }

          void checkUserSetup(newSession);
        }
      }
    );

    return () => {
      active = false;
      mountedRef.current = false;

      settingsRequestRef.current += 1;

      subscription.unsubscribe();
    };
  }, [checkUserSetup, loadAiraSettings]);

  /*
   * APP RESUME / SILENT REFRESH.
   *
   * When iOS makes the page visible again:
   * - Do not reload the page.
   * - Do not show the splash screen again.
   * - Do not reset the current page.
   * - Refresh saved assistant settings silently.
   *
   * This cannot prevent iOS from discarding the page from memory.
   */
  useEffect(() => {
    let resumeTimer = null;

    const handleAppResume = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (
        resumeRefreshRef.current ||
        !session?.user?.id ||
        screenRef.current !== "app"
      ) {
        return;
      }

      resumeRefreshRef.current = true;

      clearTimeout(resumeTimer);

      resumeTimer = setTimeout(async () => {
        try {
          /*
           * Refresh settings, not the whole app.
           * Current page and Chat component remain mounted.
           */
          const {
            data: { session: latestSession },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            throw error;
          }

          if (
            !mountedRef.current ||
            document.visibilityState !== "visible"
          ) {
            return;
          }

          if (
            latestSession?.user?.id !==
            currentUserIdRef.current
          ) {
            return;
          }

          if (latestSession) {
            setSession(latestSession);

            await loadAiraSettings(latestSession);
          }
        } catch (error) {
          console.error(
            "[Aira] Silent resume refresh failed:",
            error
          );
        } finally {
          resumeRefreshRef.current = false;
        }
      }, 300);
    };

    document.addEventListener(
      "visibilitychange",
      handleAppResume
    );

    window.addEventListener("pageshow", handleAppResume);

    return () => {
      clearTimeout(resumeTimer);

      document.removeEventListener(
        "visibilitychange",
        handleAppResume
      );

      window.removeEventListener(
        "pageshow",
        handleAppResume
      );
    };
  }, [session?.user?.id, loadAiraSettings]);

  /*
   * SPLASH SCREEN.
   */
  function handleSplashComplete() {
    saveSplashCompleted();
    setShowSplash(false);
  }

  /*
   * LOGIN.
   */
  function handleLogin(user) {
    console.log("[Aira] Login successful:", user);
    // Supabase's auth listener handles the session.
  }

  /*
   * ACCOUNT CREATION.
   */
  async function handleAccountCreated(user) {
    console.log("[Aira] Account created:", user);

    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (currentSession) {
        setSession(currentSession);
        await checkUserSetup(currentSession);
      } else {
        // Email verification might be required.
        setScreen("login");
      }
    } catch (error) {
      console.error(
        "[Aira] Could not continue after account creation:",
        error
      );

      setScreen("login");
    }
  }

  /*
   * PERSONALIZATION SETUP COMPLETED.
   */
  async function handleSetupComplete(result) {
    if (result?.goBack) {
      if (session) {
        await loadAiraSettings(session);
      }

      setScreen("app");

      return;
    }

    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (currentSession) {
        setSession(currentSession);

        await loadAiraSettings(currentSession);

        setSetupUserId(currentSession.user.id);
      }

      setCurrentPage("home");
      savePage("home");

      setScreen("app");
    } catch (error) {
      console.error(
        "[Aira] Could not finish setup:",
        error
      );
    }
  }

  /*
   * NAVIGATION.
   */
  async function navigateTo(page) {
    if (page === "aira-setup") {
      setScreen("setup");
      return;
    }

    if (page === "back-to-app") {
      if (session) {
        await loadAiraSettings(session);
      }

      setScreen("app");
      return;
    }

    if (!VALID_PAGES.includes(page)) {
      console.warn(
        "[Aira] Invalid navigation page:",
        page
      );

      return;
    }

    setCurrentPage(page);
    savePage(page);
  }

  /*
   * LOGOUT.
   */
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[Aira] Logout failed:", error);
    }
  }

  /*
   * 1. SPLASH.
   */
  if (showSplash) {
    return (
      <SplashScreenComponent
        onComplete={handleSplashComplete}
      />
    );
  }

  /*
   * 2. AUTHENTICATION LOADING.
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
   * 3. CREATE ACCOUNT.
   */
  if (screen === "create-account") {
    if (session) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="text-sm text-white/50">
            Preparing your Aira...
          </p>
        </div>
      );
    }

    return (
      <CreateAccountComponent
        onLogin={() => setScreen("login")}
        onAccountCreated={handleAccountCreated}
      />
    );
  }

  /*
   * 4. LOGIN.
   */
  if (!session) {
    return (
      <LoginComponent
        onCreateAccount={() => {
          setScreen("create-account");
        }}
        onLogin={handleLogin}
      />
    );
  }

  /*
   * 5. SETUP LOADING.
   */
  if (setupLoading && screen !== "app") {
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
   * 6. PERSONALIZATION SETTINGS.
   */
  if (screen === "setup") {
    return (
      <AiraSetupComponent
        session={session}
        onComplete={handleSetupComplete}
        onBack={async () => {
          await loadAiraSettings(session);
          setScreen("app");
        }}
      />
    );
  }

  /*
   * 7. MAIN APPLICATION.
   */
  if (screen === "app") {
    return (
      <div className="min-h-screen bg-black text-white">
        {currentPage === "home" && (
          <HomeComponent
            assistantName={assistantName}
            assistantGender={assistantGender}
            onNavigate={navigateTo}
            onOpenSettings={() =>
              navigateTo("aira-setup")
            }
          />
        )}

        {currentPage === "chat" && (
          <ChatComponent
            key={session.user.id}
            assistantName={assistantName}
            assistantGender={assistantGender}
            assistantSettingsLoading={
              assistantSettingsLoading
            }
            onNavigate={navigateTo}
          />
        )}

        {currentPage === "tasks" && (
          <TasksComponent
            assistantName={assistantName}
            assistantGender={assistantGender}
            onNavigate={navigateTo}
          />
        )}
      </div>
    );
  }

  /*
   * 8. RECOVERY.
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

        <button
          type="button"
          onClick={handleLogout}
          className="ml-2 rounded-full border border-white/10 px-5 py-3 text-sm hover:bg-white/10"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default App;