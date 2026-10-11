import { useEffect } from "react";
import orb from "../assets/aira-orb.png";

function SplashScreen({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />

        <div className="absolute left-[15%] top-[15%] h-[300px] w-[300px] rounded-full bg-blue-600/10 blur-[100px]" />

        <div className="absolute bottom-[10%] right-[10%] h-[300px] w-[300px] rounded-full bg-fuchsia-600/10 blur-[100px]" />
      </div>

      {/* Splash content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Orb */}
        <div className="aira-splash-orb flex items-center justify-center">
          <img
            src={orb}
            alt="Aira Orb"
            className="h-64 w-64 object-contain sm:h-80 sm:w-80"
          />
        </div>

        {/* Aira name */}
        <h1 className="aira-splash-title mt-6 text-center text-5xl font-semibold tracking-tight">
          
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-center text-xs font-medium uppercase tracking-[0.4em] text-white/40">
          YOUR AI COMPANION
        </p>

        {/* Loading bar */}
        <div className="mt-12 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="aira-loading h-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;