import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import orb from "../assets/aira-orb.png";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://aira-ai-backend.sahilmeshram1917.workers.dev"
).replace(/\/+$/, "");

/* =========================================================
   CONSTANTS
========================================================= */

const PERSONALITIES = [
  {
    value: "friendly_caring",
    label: "Friendly & Caring",
    description: "Warm, friendly, and supportive.",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Clear, respectful, and professional.",
  },
  {
    value: "playful",
    label: "Playful & Energetic",
    description: "Fun, cheerful, and energetic.",
  },
  {
    value: "calm",
    label: "Calm & Gentle",
    description: "Relaxed, patient, and gentle.",
  },
  {
    value: "supportive",
    label: "Supportive & Encouraging",
    description: "Encouraging and understanding.",
  },
  {
    value: "witty",
    label: "Witty & Humorous",
    description: "Clever, humorous, and conversational.",
  },
];

const LANGUAGES = [
  "English",
  "Hindi",
  "Hinglish",
  "Marathi",
];

const RESPONSE_LENGTHS = [
  {
    value: "short",
    label: "Short",
    description: "Quick and concise answers.",
  },
  {
    value: "normal",
    label: "Normal",
    description: "Balanced, conversational answers.",
  },
  {
    value: "detailed",
    label: "Detailed",
    description: "Longer explanations and more detail.",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function normalizeGender(value) {
  const gender = String(value || "")
    .trim()
    .toLowerCase();

  if (gender === "female" || gender === "male") {
    return gender;
  }

  return "";
}

function normalizeVoice(voice) {
  return {
    ...voice,

    id: String(
      voice.id ||
        voice.voice_id ||
        voice.voiceId ||
        ""
    ).trim(),

    name: String(
      voice.name ||
        voice.voice_name ||
        voice.voiceName ||
        "Unnamed voice"
    ).trim(),

    previewUrl:
      voice.previewUrl ||
      voice.preview_url ||
      voice.preview_url_ ||
      "",

    gender: String(
      voice.gender || ""
    ).trim().toLowerCase(),
  };
}

async function parseResponse(response, label) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `${label} returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.error ||
        `${label} failed (${response.status}).`
    );
  }

  return data;
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function AiraSetup({
  session,
  onComplete,
  onBack,
}) {
  const userId = session?.user?.id;

  /* Assistant identity */

  const [assistantName, setAssistantName] =
    useState("Aira");

  const [gender, setGender] =
    useState("female");

  /* Voice settings */

  const [voices, setVoices] = useState([]);

  const [selectedVoiceId, setSelectedVoiceId] =
    useState("");

  const [savedVoiceId, setSavedVoiceId] =
    useState("");

  const [savedGender, setSavedGender] =
    useState("");

  const [loadingVoices, setLoadingVoices] =
    useState(false);

  const [playingVoiceId, setPlayingVoiceId] =
    useState("");

  /* Personality settings */

  const [personality, setPersonality] =
    useState("friendly_caring");

  const [preferredLanguage, setPreferredLanguage] =
    useState("English");

  const [responseLength, setResponseLength] =
    useState("normal");

  /* AI engine settings */

  const [localAIEnabled, setLocalAIEnabled] =
    useState(true);

  const [cloudAIEnabled, setCloudAIEnabled] =
    useState(false);

  /* Saved voice tuning */

  const [voiceRate, setVoiceRate] =
    useState(1);

  const [voicePitch, setVoicePitch] =
    useState(1.05);

  /* UI state */

  const [settingsLoaded, setSettingsLoaded] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const audioRef = useRef(null);

  const voiceRequestRef = useRef(0);

  /* =======================================================
     LOAD SAVED USER SETTINGS
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setSettingsLoaded(false);
      setError("");
      setSuccessMessage("");

      if (!userId) {
        setSettingsLoaded(true);

        setError(
          "Please sign in before configuring your assistant."
        );

        return;
      }

      try {
        const { data, error: settingsError } =
          await supabase
            .from("aira_settings")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (settingsError) {
          throw settingsError;
        }

        if (cancelled) return;

        if (!data) {
          setAssistantName("Aira");
          setGender("female");

          setSavedGender("");
          setSavedVoiceId("");

          setSelectedVoiceId("");

          setPersonality("friendly_caring");
          setPreferredLanguage("English");
          setResponseLength("normal");

          setLocalAIEnabled(true);
          setCloudAIEnabled(false);

          setVoiceRate(1);
          setVoicePitch(1.05);

          return;
        }

        /* Assistant name */

        const name =
          String(
            data.assistant_name ||
              data.ai_name ||
              "Aira"
          ).trim() || "Aira";

        setAssistantName(name);

        /* Gender */

        const savedAssistantGender =
          normalizeGender(
            data.assistant_gender ||
              data.ai_gender
          );

        const initialGender =
          savedAssistantGender || "female";

        setGender(initialGender);

        setSavedGender(savedAssistantGender);

        /* Voice */

        const initialVoiceId =
          String(data.voice_id || "").trim();

        setSavedVoiceId(initialVoiceId);
        setSelectedVoiceId(initialVoiceId);

        /* Personality */

        const savedPersonality =
          String(
            data.ai_personality ||
              "friendly_caring"
          ).trim();

        const supportedPersonality =
          PERSONALITIES.some(
            (item) =>
              item.value === savedPersonality
          );

        setPersonality(
          supportedPersonality
            ? savedPersonality
            : "friendly_caring"
        );

        /* Language */

        const savedLanguage =
          String(
            data.preferred_language ||
              "English"
          ).trim();

        setPreferredLanguage(
          LANGUAGES.includes(savedLanguage)
            ? savedLanguage
            : "English"
        );

        /* Response length */

        const savedResponseLength =
          String(
            data.response_length ||
              "normal"
          ).trim().toLowerCase();

        setResponseLength(
          RESPONSE_LENGTHS.some(
            (item) =>
              item.value === savedResponseLength
          )
            ? savedResponseLength
            : "normal"
        );

        /* AI engines */

        setLocalAIEnabled(
          data.local_ai_enabled ?? true
        );

        setCloudAIEnabled(
          data.cloud_ai_enabled ?? false
        );

        /* Voice rate and pitch */

        setVoiceRate(
          Number.isFinite(Number(data.voice_rate))
            ? Number(data.voice_rate)
            : 1
        );

        setVoicePitch(
          Number.isFinite(Number(data.voice_pitch))
            ? Number(data.voice_pitch)
            : initialGender === "female"
              ? 1.05
              : 0.9
        );
      } catch (err) {
        console.error(
          "[Aira Setup] Settings loading failed:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load your saved settings."
          );
        }
      } finally {
        if (!cancelled) {
          setSettingsLoaded(true);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /* =======================================================
     LOAD VOICES FOR SELECTED GENDER
  ======================================================= */

  const loadVoices = useCallback(
    async (requestedGender) => {
      const normalizedGender =
        normalizeGender(requestedGender);

      if (!normalizedGender) {
        setVoices([]);
        setSelectedVoiceId("");

        setError(
          "Please select Female or Male first."
        );

        return;
      }

      const requestId =
        ++voiceRequestRef.current;

      setLoadingVoices(true);
      setVoices([]);
      setSelectedVoiceId("");
      setError("");

      try {
        /*
         * The Worker endpoint used here is:
         *
         * GET /api/voices?gender=female
         * GET /api/voices?gender=male
         *
         * This matches the query-based voice endpoint.
         */

        const response = await fetch(
          `${API_URL}/api/voices?gender=${encodeURIComponent(
            normalizedGender
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data = await parseResponse(
          response,
          "Voice service"
        );

        if (
          requestId !== voiceRequestRef.current
        ) {
          return;
        }

        const incomingVoices =
          Array.isArray(data.voices)
            ? data.voices
            : Array.isArray(data.data)
              ? data.data
              : [];

        const normalizedVoices =
          incomingVoices
            .map(normalizeVoice)
            .filter((voice) => voice.id);

        /*
         * Remove duplicate IDs.
         */

        const uniqueVoices = [
          ...new Map(
            normalizedVoices.map((voice) => [
              voice.id,
              voice,
            ])
          ).values(),
        ];

        /*
         * The backend should filter the list by gender.
         * Do not filter on a missing voice.gender field
         * because the ElevenLabs API may not provide it.
         */

        setVoices(uniqueVoices);

        /*
         * Restore the previous voice only when the saved
         * gender matches the current gender.
         */

        const preferredVoiceId =
          savedGender === normalizedGender
            ? savedVoiceId
            : "";

        const matchingVoice =
          uniqueVoices.find(
            (voice) =>
              voice.id === preferredVoiceId
          );

        if (matchingVoice) {
          setSelectedVoiceId(
            matchingVoice.id
          );
        }

        if (uniqueVoices.length === 0) {
          setError(
            `No voices were returned for ${normalizedGender}. Check the Worker voice endpoint.`
          );
        }
      } catch (err) {
        console.error(
          "[Aira Setup] Voice loading failed:",
          err
        );

        if (
          requestId === voiceRequestRef.current
        ) {
          setVoices([]);
          setSelectedVoiceId("");

          setError(
            err?.message ||
              "Unable to load voices. Check your internet connection and Worker configuration."
          );
        }
      } finally {
        if (
          requestId === voiceRequestRef.current
        ) {
          setLoadingVoices(false);
        }
      }
    },
    [savedGender, savedVoiceId]
  );

  /*
   * Load voices after the saved settings have loaded.
   */

  useEffect(() => {
    if (!settingsLoaded || !userId) {
      return;
    }

    loadVoices(gender);
  }, [
    settingsLoaded,
    userId,
    gender,
    loadVoices,
  ]);

  /* =======================================================
     STOP AUDIO PREVIEW
  ======================================================= */

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();

      audioRef.current.currentTime = 0;

      audioRef.current = null;
    }

    setPlayingVoiceId("");
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  /* =======================================================
     CHANGE GENDER
  ======================================================= */

  function handleGenderChange(nextGender) {
    const normalizedGender =
      normalizeGender(nextGender);

    if (!normalizedGender) {
      return;
    }

    if (normalizedGender === gender) {
      return;
    }

    stopPreview();

    setGender(normalizedGender);

    /*
     * Do not keep a voice selected from the old gender.
     */

    setSelectedVoiceId("");
    setVoices([]);

    setVoicePitch(
      normalizedGender === "female"
        ? 1.05
        : 0.9
    );

    setError("");
    setSuccessMessage("");
  }

  /* =======================================================
     SELECT AND PREVIEW VOICE
  ======================================================= */

  async function handleVoiceSelect(voice) {
    if (!voice?.id) {
      return;
    }

    /*
     * Selecting a voice must work even when preview
     * audio cannot be played.
     */

    setSelectedVoiceId(voice.id);

    setSuccessMessage("");
    setError("");

    stopPreview();

    if (!voice.previewUrl) {
      return;
    }

    try {
      const audio = new Audio(
        voice.previewUrl
      );

      audioRef.current = audio;

      setPlayingVoiceId(voice.id);

      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }

        setPlayingVoiceId("");
      };

      audio.onerror = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }

        setPlayingVoiceId("");
      };

      await audio.play();
    } catch (err) {
      console.warn(
        "[Aira Setup] Preview playback failed:",
        err
      );

      setPlayingVoiceId("");

      /*
       * Keep the selected voice.
       */

      setError(
        "Voice selected, but its preview could not be played."
      );
    }
  }

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  async function handleContinue() {
    setError("");
    setSuccessMessage("");

    const trimmedName =
      assistantName.trim();

    const normalizedGender =
      normalizeGender(gender);

    if (!userId) {
      setError(
        "Your session has expired. Please sign in again."
      );

      return;
    }

    if (!trimmedName) {
      setError(
        "Please enter a name for your assistant."
      );

      return;
    }

    if (!normalizedGender) {
      setError(
        "Please select Female or Male."
      );

      return;
    }

    if (!selectedVoiceId) {
      setError(
        "Please select a voice before continuing."
      );

      return;
    }

    const selectedVoice =
      voices.find(
        (voice) =>
          voice.id === selectedVoiceId
      );

    if (!selectedVoice) {
      setError(
        "Your selected voice is no longer available. Please choose a voice again."
      );

      return;
    }

    if (
      !PERSONALITIES.some(
        (item) => item.value === personality
      )
    ) {
      setError(
        "Please select a valid personality."
      );

      return;
    }

    if (!LANGUAGES.includes(preferredLanguage)) {
      setError(
        "Please select a valid language."
      );

      return;
    }

    if (
      !RESPONSE_LENGTHS.some(
        (item) =>
          item.value === responseLength
      )
    ) {
      setError(
        "Please select a valid response length."
      );

      return;
    }

    setSaving(true);

    try {
      const now =
        new Date().toISOString();

      const settings = {
        user_id: userId,

        /* Identity */

        ai_name: trimmedName,

        assistant_name: trimmedName,

        /* Gender */

        ai_gender: normalizedGender,

        assistant_gender: normalizedGender,

        /* Voice */

        ai_voice: selectedVoice.name,

        voice_name: selectedVoice.name,

        voice_id: selectedVoice.id,

        voice_provider: "elevenlabs",

        voice_rate: voiceRate,

        voice_pitch: voicePitch,

        /* Personality */

        ai_personality: personality,

        /* Language */

        preferred_language: preferredLanguage,

        /* Response length */

        response_length: responseLength,

        /* AI engine preferences */

        local_ai_enabled: localAIEnabled,

        cloud_ai_enabled: cloudAIEnabled,

        /* Timestamp */

        updated_at: now,
      };

      /*
       * Requires user_id to be UNIQUE or a primary key.
       */

      const { error: saveError } =
        await supabase
          .from("aira_settings")
          .upsert(settings, {
            onConflict: "user_id",
          });

      if (saveError) {
        throw saveError;
      }

      /*
       * Confirm that the saved record can be read back.
       */

      const { data: verifiedSettings, error: verifyError } =
        await supabase
          .from("aira_settings")
          .select(
            [
              "user_id",
              "ai_name",
              "ai_gender",
              "ai_voice",
              "ai_personality",
              "preferred_language",
              "response_length",
              "local_ai_enabled",
              "cloud_ai_enabled",
              "assistant_name",
              "assistant_gender",
              "voice_name",
              "voice_rate",
              "voice_pitch",
              "voice_id",
              "voice_provider",
            ].join(",")
          )
          .eq("user_id", userId)
          .maybeSingle();

      if (verifyError) {
        throw verifyError;
      }

      if (!verifiedSettings) {
        throw new Error(
          "Settings were submitted, but the saved record could not be verified. Check your Supabase permissions."
        );
      }

      /*
       * Update local state with the verified values.
       */

      setAssistantName(
        verifiedSettings.assistant_name ||
          verifiedSettings.ai_name ||
          trimmedName
      );

      setGender(
        normalizeGender(
          verifiedSettings.assistant_gender ||
            verifiedSettings.ai_gender
        ) || normalizedGender
      );

      setSavedGender(normalizedGender);

      setSavedVoiceId(
        verifiedSettings.voice_id ||
          selectedVoice.id
      );

      setSelectedVoiceId(
        verifiedSettings.voice_id ||
          selectedVoice.id
      );

      setSuccessMessage(
        "Your assistant settings have been saved."
      );

      stopPreview();

      /*
       * Pass all saved preferences to the parent.
       */

      if (onComplete) {
        onComplete({
          assistantName: trimmedName,
          assistantGender: normalizedGender,
          gender: normalizedGender,

          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
          voiceProvider: "elevenlabs",

          voiceRate,
          voicePitch,

          personality,

          preferredLanguage,

          responseLength,

          localAIEnabled,
          cloudAIEnabled,

          settings: verifiedSettings,
        });
      }
    } catch (err) {
      console.error(
        "[Aira Setup] Save failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to save assistant settings."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     BACK NAVIGATION
  ======================================================= */

  function handleBack() {
    stopPreview();

    if (onBack) {
      onBack();
      return;
    }

    if (onComplete) {
      onComplete({
        goBack: true,
      });
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-8 pt-5 sm:px-6">

        {/* Header */}

        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>

          <span className="text-sm text-white/35">
            Personalize your AI
          </span>

          <span className="w-10" />
        </header>

        {/* Assistant orb */}

        <section className="mt-7 text-center">
          <div className="aira-setup-orb mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_65px_rgba(0,200,255,0.12)]">
            <img
              src={orb}
              alt="AI assistant orb"
              className="h-20 w-20 object-contain"
            />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Meet your AI companion
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/40">
            Choose how your assistant looks, speaks,
            and responds to you.
          </p>
        </section>

        {/* Assistant name */}

        <section className="mt-8">
          <label
            htmlFor="assistant-name"
            className="mb-2 block text-sm font-medium text-white/75"
          >
            Assistant name
          </label>

          <input
            id="assistant-name"
            type="text"
            value={assistantName}
            onChange={(event) => {
              setAssistantName(
                event.target.value
              );

              setSuccessMessage("");
            }}
            maxLength={30}
            placeholder="Enter assistant name"
            autoComplete="off"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/50"
          />
        </section>

        {/* Gender */}

        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-white/75">
              Gender
            </span>

            <span className="text-xs text-white/35">
              Determines voice selection
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "female",
                label: "Female",
              },
              {
                value: "male",
                label: "Male",
              },
            ].map((item) => {
              const selected =
                gender === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    handleGenderChange(
                      item.value
                    )
                  }
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    selected
                      ? "border-cyan-400/50 bg-cyan-400/10 text-white"
                      : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.07]"
                  }`}
                >
                  {selected && (
                    <Check size={15} />
                  )}

                  {item.label}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-xs leading-5 text-white/35">
            {gender === "female"
              ? "Female voice options are displayed below."
              : "Male voice options are displayed below."}
          </p>
        </section>

        {/* Voice list */}

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-white/80">
                Choose a voice
              </h2>

              <p className="mt-1 text-xs text-white/35">
                Preview and select your preferred voice.
              </p>
            </div>

            <span className="text-xs text-white/35">
              {loadingVoices
                ? "Loading..."
                : `${voices.length} voices`}
            </span>
          </div>

          {loadingVoices ? (
            <div className="flex min-h-28 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Loader2
                size={20}
                className="animate-spin text-cyan-300"
              />

              <span className="ml-3 text-sm text-white/40">
                Loading {gender} voices...
              </span>
            </div>
          ) : voices.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
              <VolumeX
                size={24}
                className="mx-auto text-white/30"
              />

              <p className="mt-3 text-sm text-white/55">
                No voices available.
              </p>

              <button
                type="button"
                onClick={() =>
                  loadVoices(gender)
                }
                className="mt-3 text-sm text-cyan-300 hover:text-cyan-200"
              >
                Retry loading voices
              </button>
            </div>
          ) : (
            <div className="max-h-[330px] space-y-2 overflow-y-auto overscroll-contain pr-1">
              {voices.map((voice) => {
                const selected =
                  selectedVoiceId === voice.id;

                const playing =
                  playingVoiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                      selected
                        ? "border-cyan-400/50 bg-cyan-400/[0.08]"
                        : "border-white/10 bg-white/[0.035]"
                    }`}
                  >
                    {/* Preview button */}

                    <button
                      type="button"
                      aria-label={
                        playing
                          ? `Stop ${voice.name} preview`
                          : `Play ${voice.name} preview`
                      }
                      onClick={() =>
                        handleVoiceSelect(voice)
                      }
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition hover:bg-cyan-400/15 hover:text-cyan-300"
                    >
                      {playing ? (
                        <Volume2 size={19} />
                      ) : (
                        <Play
                          size={17}
                          fill="currentColor"
                        />
                      )}
                    </button>

                    {/* Select voice */}

                    <button
                      type="button"
                      onClick={() => {
                        stopPreview();

                        setSelectedVoiceId(
                          voice.id
                        );

                        setError("");
                        setSuccessMessage("");
                      }}
                      aria-pressed={selected}
                      className="min-w-0 flex-1 py-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-white">
                        {voice.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-white/35">
                        {voice.category ||
                          voice.accent ||
                          "Voice available"}
                      </p>
                    </button>

                    {/* Selection indicator */}

                    <button
                      type="button"
                      aria-label={`Select ${voice.name}`}
                      aria-pressed={selected}
                      onClick={() => {
                        stopPreview();

                        setSelectedVoiceId(
                          voice.id
                        );

                        setError("");
                        setSuccessMessage("");
                      }}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                        selected
                          ? "border-cyan-300 bg-cyan-300 text-black"
                          : "border-white/15 bg-transparent text-transparent"
                      }`}
                    >
                      <Check
                        size={15}
                        strokeWidth={3}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Personality */}

        <section className="mt-8 border-t border-white/10 pt-6">
          <div className="mb-3">
            <h2 className="text-sm font-medium text-white/80">
              Personality
            </h2>

            <p className="mt-1 text-xs text-white/35">
              Choose how your assistant behaves.
            </p>
          </div>

          <div className="space-y-2">
            {PERSONALITIES.map((item) => {
              const selected =
                personality === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setPersonality(item.value);

                    setSuccessMessage("");
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-cyan-400/40 bg-cyan-400/[0.07]"
                      : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-white/90">
                      {item.label}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-white/40">
                      {item.description}
                    </p>
                  </div>

                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-cyan-300 bg-cyan-300 text-black"
                        : "border-white/15 text-transparent"
                    }`}
                  >
                    <Check size={14} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Preferred language */}

        <section className="mt-7">
          <label
            htmlFor="preferred-language"
            className="mb-2 block text-sm font-medium text-white/75"
          >
            Preferred language
          </label>

          <div className="relative">
            <select
              id="preferred-language"
              value={preferredLanguage}
              onChange={(event) => {
                setPreferredLanguage(
                  event.target.value
                );

                setSuccessMessage("");
              }}
              className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-[#111111] px-4 pr-10 text-base text-white outline-none focus:border-cyan-400/50"
            >
              {LANGUAGES.map((language) => (
                <option
                  key={language}
                  value={language}
                >
                  {language}
                </option>
              ))}
            </select>

            <ChevronDown
              size={17}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
            />
          </div>
        </section>

        {/* Response length */}

        <section className="mt-7">
          <label
            htmlFor="response-length"
            className="mb-2 block text-sm font-medium text-white/75"
          >
            Response length
          </label>

          <div className="space-y-2">
            {RESPONSE_LENGTHS.map((item) => {
              const selected =
                responseLength === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setResponseLength(
                      item.value
                    );

                    setSuccessMessage("");
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-cyan-400/40 bg-cyan-400/[0.06]"
                      : "border-white/10 bg-white/[0.025]"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-white/90">
                      {item.label}
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      {item.description}
                    </p>
                  </div>

                  <span
                    className={`h-4 w-4 shrink-0 rounded-full border ${
                      selected
                        ? "border-[5px] border-cyan-300"
                        : "border-white/25"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* Voice tuning */}

        <section className="mt-7 border-t border-white/10 pt-6">
          <h2 className="text-sm font-medium text-white/80">
            Voice tuning
          </h2>

          <p className="mt-1 text-xs text-white/35">
            Adjust how quickly and how high or low your
            assistant speaks.
          </p>

          {/* Voice rate */}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="voice-rate"
                className="text-sm text-white/65"
              >
                Speaking speed
              </label>

              <span className="text-sm text-cyan-300">
                {voiceRate.toFixed(2)}×
              </span>
            </div>

            <input
              id="voice-rate"
              type="range"
              min="0.7"
              max="1.3"
              step="0.05"
              value={voiceRate}
              onChange={(event) => {
                setVoiceRate(
                  Number(event.target.value)
                );

                setSuccessMessage("");
              }}
              className="w-full accent-cyan-400"
            />

            <div className="flex justify-between text-xs text-white/30">
              <span>Slower</span>
              <span>Faster</span>
            </div>
          </div>

          {/* Voice pitch */}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="voice-pitch"
                className="text-sm text-white/65"
              >
                Voice pitch
              </label>

              <span className="text-sm text-cyan-300">
                {voicePitch.toFixed(2)}
              </span>
            </div>

            <input
              id="voice-pitch"
              type="range"
              min="0.7"
              max="1.3"
              step="0.05"
              value={voicePitch}
              onChange={(event) => {
                setVoicePitch(
                  Number(event.target.value)
                );

                setSuccessMessage("");
              }}
              className="w-full accent-cyan-400"
            />

            <div className="flex justify-between text-xs text-white/30">
              <span>Lower</span>
              <span>Higher</span>
            </div>
          </div>
        </section>

        {/* AI engine preferences */}

        <section className="mt-8 border-t border-white/10 pt-6">
          <h2 className="text-sm font-medium text-white/80">
            AI engine preferences
          </h2>

          <p className="mt-1 text-xs leading-5 text-white/35">
            Select which AI engines Aira is allowed to use.
          </p>

          {/* Local AI */}

          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div>
              <p className="text-sm font-medium text-white/90">
                Local AI
              </p>

              <p className="mt-1 text-xs leading-5 text-white/40">
                Allow your local AI engine when available.
              </p>
            </div>

            <input
              type="checkbox"
              checked={localAIEnabled}
              onChange={(event) => {
                setLocalAIEnabled(
                  event.target.checked
                );

                setSuccessMessage("");
              }}
              className="h-5 w-5 shrink-0 accent-cyan-400"
            />
          </label>

          {/* Cloud AI */}

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div>
              <p className="text-sm font-medium text-white/90">
                Cloud AI
              </p>

              <p className="mt-1 text-xs leading-5 text-white/40">
                Allow your Cloudflare-hosted AI engine.
              </p>
            </div>

            <input
              type="checkbox"
              checked={cloudAIEnabled}
              onChange={(event) => {
                setCloudAIEnabled(
                  event.target.checked
                );

                setSuccessMessage("");
              }}
              className="h-5 w-5 shrink-0 accent-cyan-400"
            />
          </label>

          {!localAIEnabled && !cloudAIEnabled && (
            <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-300">
              Both AI engines are disabled. Enable at
              least one engine if you want Aira to
              generate responses.
            </p>
          )}
        </section>

        {/* Error */}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-300"
          >
            {error}
          </div>
        )}

        {/* Success */}

        {successMessage && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm leading-6 text-emerald-300"
          >
            {successMessage}
          </div>
        )}

        {/* Save button */}

        <div className="sticky bottom-0 mt-7 bg-black pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={
              saving ||
              !settingsLoaded ||
              loadingVoices ||
              !selectedVoiceId ||
              !assistantName.trim() ||
              (!localAIEnabled && !cloudAIEnabled)
            }
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {saving ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Saving settings...
              </>
            ) : (
              <>
                <Sparkles size={17} />

                Save & Continue
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs text-white/25">
            Your preferences are saved to your account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AiraSetup;