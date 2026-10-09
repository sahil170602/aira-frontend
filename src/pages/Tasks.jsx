import { ArrowLeft, CheckSquare } from "lucide-react";

function Tasks({
  assistantName = "Aira",
  onNavigate,
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-5 sm:px-7">
        <button
          type="button"
          onClick={() => onNavigate?.("home")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Back to Home"
        >
          <ArrowLeft size={19} />
        </button>

        <div className="flex items-center gap-3">
          

          <h1 className="text-xl font-semibold">
            Tasks
          </h1>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex min-h-[calc(100vh-90px)] items-center justify-center px-6">
        <div className="text-center">
          <CheckSquare
            size={32}
            className="mx-auto mb-4 text-white/20"
          />

          <p className="text-sm text-white/30">
            {assistantName} tasks will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Tasks;