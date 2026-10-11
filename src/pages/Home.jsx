import { useEffect, useState } from "react";
import { Mic } from "lucide-react";

import orb from "../assets/aira-orb.png";

import AiraHeader from "../components/AiraHeader";
import BottomNav from "../components/BottomNav";

function Home({
  assistantName = "Aira",
  onNavigate,
  onOpenSettings,
}) {
  const [isListening] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Use the name selected by the current user.
  const displayName =
    typeof assistantName === "string" &&
    assistantName.trim().length > 0
      ? assistantName.trim()
      : "Aira";

  /*
   * Temporary speaking animation.
   *
   * This animation is visual only. Connect it to the
   * actual voice engine when speech playback is implemented.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSpeaking(true);

      const stopTimer = setTimeout(() => {
        setIsSpeaking(false);
      }, 2200);

      // Clean up the inner timer.
      return () => clearTimeout(stopTimer);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[42%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.04] blur-[120px]" />

        <div className="absolute left-[10%] top-[20%] h-[250px] w-[250px] rounded-full bg-blue-600/[0.025] blur-[100px]" />

        <div className="absolute bottom-[15%] right-[5%] h-[250px] w-[250px] rounded-full bg-fuchsia-600/[0.025] blur-[100px]" />
      </div>

      {/* Header */}
      <AiraHeader
        assistantName={displayName}
        status={isListening ? "Listening" : "Offline"}
        onSettings={onOpenSettings}
      />

      {/* Main */}
      <main className="relative z-10 flex min-h-[calc(100vh-150px)] flex-col items-center justify-center px-6 pb-28">
        {/* Greeting and status */}
        <div className="mb-8 text-center">
          <p className="text-sm text-white/30">
            {isSpeaking
              ? `${displayName} is speaking`
              : isListening
                ? `${displayName} is listening...`
                : `${displayName} is ready when you are`}
          </p>
        </div>

        {/* Orb */}
        <div
          className={`aira-home-orb ${
            isSpeaking
              ? "aira-home-orb-speaking"
              : "aira-home-orb-idle"
          }`}
        >
          <div className="relative flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
            {/* Orb glow */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-700 ${
                isSpeaking
                  ? "bg-cyan-400/[0.06] blur-[45px]"
                  : "bg-cyan-400/[0.025] blur-[35px]"
              }`}
            />

            {/* Aira orb */}
            <img
              src={orb}
              alt={`${displayName} assistant orb`}
              className="relative h-56 w-56 object-contain sm:h-64 sm:w-64"
            />
          </div>
        </div>

        {/* Listening indicator */}
        <div className="mt-10 flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] px-5 py-2.5 backdrop-blur-xl">
          <div className="flex items-center gap-1">
            <span className="aira-mic-wave h-3 w-0.5 rounded-full" />

            <span className="aira-mic-wave h-5 w-0.5 rounded-full [animation-delay:120ms]" />

            <span className="aira-mic-wave h-4 w-0.5 rounded-full [animation-delay:240ms]" />

            <span className="aira-mic-wave h-2.5 w-0.5 rounded-full [animation-delay:360ms]" />
          </div>

          <span className="text-xs text-white/40">
            {isListening
              ? `${displayName} is ready`
              : "Listening paused"}
          </span>

          <Mic
            size={14}
            className="text-cyan-300/60"
          />
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentPage="home"
        onNavigate={onNavigate}
      />
    </div>
  );
}

export default Home;