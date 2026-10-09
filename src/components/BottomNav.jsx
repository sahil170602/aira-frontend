import {
  CheckSquare,
  MessageCircle,
} from "lucide-react";

import orb from "../assets/aira-orb.png";

function BottomNav({
  currentPage = "home",
  onNavigate,
}) {
  function navigate(page) {
    onNavigate?.(page);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4">
      <div className="relative mx-auto flex h-[72px] max-w-70 items-center justify-between rounded-[28px] border border-white/10 bg-black/75 px-4 shadow-[0_-10px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">

        {/* =================================
            CHAT
        ================================= */}
        <button
          type="button"
          onClick={() => navigate("chat")}
          className={`group flex h-12 w-20 flex-col items-center justify-center gap-1 rounded-2xl transition ${
            currentPage === "chat"
              ? "text-white"
              : "text-white/35 hover:bg-white/[0.05] hover:text-white"
          }`}
        >
          <MessageCircle
            size={30}
            className="transition group-hover:scale-105"
          />

          <span className="text-[12px] font-medium">
            Chat
          </span>
        </button>

        {/* =================================
            CENTER AIRA ORB
        ================================= */}
        <button
          type="button"
          onClick={() => navigate("home")}
          className={`aira-nav-orb absolute left-1/2 top-1/8 flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-[54%] items-center justify-center rounded-full border border-white/15 bg-black shadow-[0_0_35px_rgba(0,200,255,0.12)] transition hover:scale-105 ${
            currentPage === "home"
              ? "ring-1 ring-white/0"
              : ""
          }`}
          aria-label="Aira Home"
        >
          <img
            src={orb}
            alt="Aira Home"
            className="h-[96px] w-[96px] object-contain"
          />
        </button>

        {/* =================================
            TASKS
        ================================= */}
        <button
          type="button"
          onClick={() => navigate("tasks")}
          className={`group flex h-12 w-20 flex-col items-center justify-center gap-1 rounded-2xl transition ${
            currentPage === "tasks"
              ? "text-white"
              : "text-white/35 hover:bg-white/[0.05] hover:text-white"
          }`}
        >
          <CheckSquare
            size={30}
            className="transition group-hover:scale-105"
          />

          <span className="text-[12px] font-medium">
            Tasks
          </span>
        </button>
      </div>
    </nav>
  );
}

export default BottomNav;