import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, Loader2, Play, Sparkles } from "lucide-react";

import { supabase } from "../lib/supabase";
import orb from "../assets/aira-orb.png";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function AiraSetup({ session, onComplete }) {
  const [assistantName, setAssistantName] = useState("Aira");
  const [gender, setGender] = useState("female");

  const [voices, setVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");

  const [loadingVoices, setLoadingVoices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const audioRef = useRef(null);

  /*
   * Load voices whenever gender changes.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadVoices() {
      setLoadingVoices(true);
      setError("");
      setSelectedVoiceId("");

      try {
        const response = await fetch(
          `${API_URL}/api/voices?gender=${gender}`,
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Unable to load voices.",
          );
        }

        if (!cancelled) {
          setVoices(data.voices || []);
        }
      } catch (err) {
        console.error("Voice loading error:", err);

        if (!cancelled) {
          setVoices([]);
          setError(
            err.message ||
              "Unable to load ElevenLabs voices.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingVoices(false);
        }
      }
    }

    loadVoices();

    return () => {
      cancelled = true;
    };
  }, [gender]);

  /*
   * Stop currently playing preview when leaving the page
   * or switching voice lists.
   */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const selectedVoice = useMemo(
    () =>
      voices.find(
        (voice) => voice.id === selectedVoiceId,
      ) || null,
    [voices, selectedVoiceId],
  );

  /*
   * Play the ElevenLabs preview immediately when a voice
   * is tapped.
   */
  async function handleVoiceSelect(voice) {
    setError("");

    if (!voice?.id) return;

    setSelectedVoiceId(voice.id);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (!voice.previewUrl) {
      setError(
        "This voice does not have a preview available.",
      );
      return;
    }

    try {
      const audio = new Audio(voice.previewUrl);

      audioRef.current = audio;

      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
      };

      await audio.play();
    } catch (err) {
      console.error("Voice preview error:", err);

      setError(
        "Unable to play this voice preview.",
      );
    }
  }

  /*
   * Save assistant configuration to Supabase.
   */
  async function handleContinue() {
    setError("");

    const trimmedName = assistantName.trim();

    if (!trimmedName) {
      setError("Please enter a name for your AI assistant.");
      return;
    }

    if (!selectedVoice) {
      setError("Please select a voice.");
      return;
    }

    if (!session?.user?.id) {
      setError(
        "Your session has expired. Please log in again.",
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * Save voice + assistant settings.
       */
      const { error: settingsError } =
        await supabase
          .from("aira_settings")
          .upsert(
            {
              user_id: session.user.id,
              assistant_name: trimmedName,
              assistant_gender: gender,
              voice_id: selectedVoice.id,
              voice_name: selectedVoice.name,
              voice_provider: "elevenlabs",
              voice_rate: 1,
              voice_pitch:
                gender === "female" ? 1.05 : 0.9,
            },
            {
              onConflict: "user_id",
            },
          );

      if (settingsError) {
        throw settingsError;
      }

      /*
       * Mark setup as completed.
       */
      const { error: profileError } =
        await supabase
          .from("profiles")
          .update({
            setup_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.user.id);

      if (profileError) {
        throw profileError;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      onComplete({
        assistantName: trimmedName,
        gender,
        voiceId: selectedVoice.id,
        voiceName: selectedVoice.name,
      });
    } catch (err) {
      console.error("Aira setup save error:", err);

      setError(
        err.message ||
          "Unable to save Aira settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-8 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onComplete?.({ goBack: true })}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-xs font-medium uppercase tracking-[0.25em] text-white/30">
            Aira Setup
          </div>

          <div className="w-10" />
        </div>

        {/* Orb */}
        <div className="mt-8 text-center">
          <div className="aira-setup-orb mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_70px_rgba(0,200,255,0.12)]">
            <img
              src={orb}
              alt="Aira"
              className="h-20 w-20 object-contain"
            />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Meet your AI companion
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/40">
            Give your assistant a name and choose the
            voice you want to hear.
          </p>
        </div>

        {/* Name */}
        <section className="mt-8">
          <label className="mb-2 block text-sm font-medium text-white/70">
            Assistant name
          </label>

          <input
            type="text"
            value={assistantName}
            onChange={(event) =>
              setAssistantName(event.target.value)
            }
            placeholder="Aira"
            maxLength={30}
            className="h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-base text-white outline-none transition placeholder:text-white/20 focus:border-cyan-400/40 focus:bg-white/[0.07]"
          />
        </section>

        {/* Gender */}
        <section className="mt-6">
          <label className="mb-2 block text-sm font-medium text-white/70">
            Voice style
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGender("female")}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                gender === "female"
                  ? "border-cyan-400/50 bg-cyan-400/10 text-white shadow-[0_0_25px_rgba(0,200,255,0.08)]"
                  : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              Female
            </button>

            <button
              type="button"
              onClick={() => setGender("male")}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                gender === "male"
                  ? "border-cyan-400/50 bg-cyan-400/10 text-white shadow-[0_0_25px_rgba(0,200,255,0.08)]"
                  : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              Male
            </button>
          </div>
        </section>

        {/* Voices */}
        <section className="mt-6 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-white/70">
              Choose a voice
            </label>

            {!loadingVoices && voices.length > 0 && (
              <span className="text-xs text-white/25">
                {voices.length} voices
              </span>
            )}
          </div>

          {loadingVoices ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-3 text-sm text-white/40">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Loading ElevenLabs voices...
              </div>
            </div>
          ) : voices.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-sm text-white/40">
                No voices were found.
              </p>
            </div>
          ) : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {voices.map((voice) => {
                const selected =
                  selectedVoiceId === voice.id;

                return (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() =>
                      handleVoiceSelect(voice)
                    }
                    className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      selected
                        ? "border-cyan-400/50 bg-cyan-400/[0.08]"
                        : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"
                    }`}
                  >
                    {/* Play icon */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
                        selected
                          ? "bg-cyan-400/15 text-cyan-300"
                          : "bg-white/[0.06] text-white/50 group-hover:text-white"
                      }`}
                    >
                      <Play
                        size={17}
                        fill="currentColor"
                      />
                    </div>

                    {/* Voice info */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">
                        {voice.name}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-white/30">
                        {voice.accent && (
                          <span>
                            {voice.accent}
                          </span>
                        )}

                        {voice.age && (
                          <span>
                            {voice.age}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selected */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                        selected
                          ? "border-cyan-300 bg-cyan-300 text-black"
                          : "border-white/10 bg-white/[0.03] text-transparent"
                      }`}
                    >
                      <Check size={15} strokeWidth={3} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Selected voice */}
        {selectedVoice && !error && (
          <div className="mt-4 flex items-center gap-2 text-xs text-white/35">
            <Sparkles size={14} />
            <span>
              {selectedVoice.name} selected
            </span>
          </div>
        )}

        {/* Continue */}
        <div className="mt-5 pb-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving || !selectedVoice}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {saving ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AiraSetup;