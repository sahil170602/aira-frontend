import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { supabase } from "../lib/supabase";

function CreateAccount({ onLogin, onAccountCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleCreateAccount(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          name,
        });

        await supabase.from("aira_settings").upsert({
          user_id: data.user.id,
          ai_name: "Aira",
          ai_personality: "friendly_caring",
        });

        await supabase
          .from("notification_preferences")
          .upsert({
            user_id: data.user.id,
          });
      }

      if (!data.session) {
        setSuccess(
          "Account created. Please check your email to verify your account.",
        );
      } else {
        onAccountCreated(data.user);
      }
    } catch (error) {
      setError(error.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black px-5 py-10 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold">
            Create your account
          </h1>

          <p className="mt-3 text-sm text-white/40">
            Let's get Aira ready for you.
          </p>
        </div>

        <form onSubmit={handleCreateAccount} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white/60">
              Your name
            </label>

            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-4">
              <User size={18} className="text-white/30" />

              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="h-12 w-full bg-transparent px-3 text-sm outline-none placeholder:text-white/25"
              />
            </div>
          </div>

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
                placeholder="At least 6 characters"
                autoComplete="new-password"
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

          <div>
            <label className="mb-2 block text-sm text-white/60">
              Confirm password
            </label>

            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-4">
              <Lock size={18} className="text-white/30" />

              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Repeat your password"
                autoComplete="new-password"
                className="h-12 w-full bg-transparent px-3 text-sm outline-none placeholder:text-white/25"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((value) => !value)
                }
                className="text-white/40 hover:text-white"
              >
                {showConfirmPassword ? (
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

          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-white font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-white/40">
          Already have an account?

          <button
            type="button"
            onClick={onLogin}
            className="ml-2 text-white hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateAccount;