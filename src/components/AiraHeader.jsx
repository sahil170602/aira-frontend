import { Settings } from "lucide-react";

function AiraHeader({
  assistantName = "Aira",
  status = "Listening",
  onSettings,
}) {
  return (
    <header className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-7">
      {/* Left */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {assistantName}
        </h1>

        <div className="mt-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

          <span className="text-[11px] uppercase tracking-[0.18em] text-white/30">
            {status}
          </span>
        </div>
      </div>

      {/* Settings */}
      <button
        type="button"
        onClick={onSettings}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 transition hover:bg-white/10 hover:text-white active:scale-95"
        aria-label="Open Aira settings"
        title="Aira Settings"
      >
        <Settings size={18} />
      </button>
    </header>
  );
}

export default AiraHeader;