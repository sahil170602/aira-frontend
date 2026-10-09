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

    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      onLogin(data.user);
    } catch (error) {
      setError(error.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-semibold">Welcome back</h1>

          <p className="mt-3 text-sm text-white/40">
            Sign in to continue with Aira
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white/60">
              Email
            </label>

            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-4">
              <Mail size={18} className="text-white/30" />

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="h-12 w-full bg-transparent px-3 text-sm outline-none placeholder:text-white/25"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60">
              Password
            </label>

            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-4">
              <Lock size={18} className="text-white/30" />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                className="h-12 w-full bg-transparent px-3 text-sm outline-none placeholder:text-white/25"
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-white/40 hover:text-white"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-white font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-white/40">
          Don't have an account?

          <button
            type="button"
            onClick={onCreateAccount}
            className="ml-2 text-white hover:underline"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;