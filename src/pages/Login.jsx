import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";

function Login({ onCreateAccount, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (loginError) {
        throw loginError;
      }

      if (!data?.user) {
        throw new Error("Login succeeded, but no user was returned.");
      }

      onLogin?.(data.user);
    } catch (error) {
      console.error("[Aira] Login error:", error);

      setError(
        error?.message || "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCreateAccount() {
    if (loading) return;

    setError("");

    if (typeof onCreateAccount === "function") {
      onCreateAccount();
    } else {
      console.error(
        "[Aira] Create Account callback is missing."
      );

      setError(
        "Unable to open account registration. Please refresh the page."
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 py-10 text-white">
      <div className="w-full max-w-md">
        {/* HEADER */}

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-semibold">
            Welcome back
          </h1>

          <p className="mt-3 text-sm text-white/40">
            Sign in to continue
          </p>
        </div>

        {/* LOGIN FORM */}

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          {/* EMAIL */}

          <div>
            <label
              htmlFor="aira-login-email"
              className="mb-2 block text-sm text-white/60"
            >
              Email
            </label>

            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 transition focus-within:border-white/30">
              <Mail
                size={18}
                aria-hidden="true"
                className="shrink-0 text-white/30"
              />

              <input
                id="aira-login-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);

                  if (error) {
                    setError("");
                  }
                }}
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={loading}
                className="h-12 w-full min-w-0 bg-transparent px-3 text-base outline-none placeholder:text-white/25"
              />
            </div>
          </div>

          {/* PASSWORD */}

          <div>
            <label
              htmlFor="aira-login-password"
              className="mb-2 block text-sm text-white/60"
            >
              Password
            </label>

            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 transition focus-within:border-white/30">
              <Lock
                size={18}
                aria-hidden="true"
                className="shrink-0 text-white/30"
              />

              <input
                id="aira-login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);

                  if (error) {
                    setError("");
                  }
                }}
                placeholder="Your password"
                autoComplete="current-password"
                required
                disabled={loading}
                className="h-12 w-full min-w-0 bg-transparent px-3 text-base outline-none placeholder:text-white/25"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((value) => !value)
                }
                disabled={loading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                aria-pressed={showPassword}
                className="shrink-0 text-white/40 transition hover:text-white disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {/* SIGN IN */}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-white font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* CREATE ACCOUNT */}

        <div className="mt-8 text-center text-sm text-white/40">
          <span>Don't have an account?</span>

          <button
  type="button"
  onClick={() => {
    console.log("[Aira] Create account clicked");
    onCreateAccount?.();
  }}
  className="ml-2 text-white hover:underline"
>
  Create account
</button>
        </div>
      </div>
    </main>
  );
}

export default Login;