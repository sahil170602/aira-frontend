import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckSquare,
  Plus,
  RefreshCw,
  CalendarDays,
  Clock,
  Circle,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  ListTodo,
} from "lucide-react";

import {
  getAiraTasks,
  createAiraTask,
  updateAiraTask,
} from "../services/chatService";

function Tasks({
  assistantName = "Aira",
  onNavigate,
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const [filter, setFilter] = useState("all");

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "normal",
    dueDate: "",
    dueTime: "",
    category: "general",
  });

  const loadTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result = await getAiraTasks();

      setTasks(
        Array.isArray(result.tasks)
          ? result.tasks
          : []
      );
    } catch (err) {
      console.error("[Aira Tasks] Load failed:", err);

      setError(
        err.message || "Unable to load your tasks."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      priority: "normal",
      dueDate: "",
      dueTime: "",
      category: "general",
    });

    setShowForm(false);
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();

    const title = form.title.trim();

    if (!title) {
      setError("Please enter a task title.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let dueAt = null;

      if (form.dueDate) {
        const time = form.dueTime || "23:59";
        const localDateTime = `${form.dueDate}T${time}:00`;
        const parsedDate = new Date(localDateTime);

        if (Number.isNaN(parsedDate.getTime())) {
          throw new Error(
            "Please enter a valid due date and time."
          );
        }

        if (parsedDate.getTime() <= Date.now()) {
          throw new Error(
            "The due date and time must be in the future."
          );
        }

        dueAt = parsedDate.toISOString();
      }

      const result = await createAiraTask({
        title,
        description: form.description.trim(),
        priority: form.priority,
        due_at: dueAt,
        category: form.category.trim() || "general",
      });

      if (result.task) {
        setTasks((previous) => [
          result.task,
          ...previous,
        ]);
      } else {
        await loadTasks(true);
      }

      resetForm();
    } catch (err) {
      console.error("[Aira Tasks] Create failed:", err);

      setError(
        err.message || "Unable to create this task."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTask = async (task) => {
    if (!task?.id || updatingTaskId) {
      return;
    }

    const nextStatus =
      task.status === "completed"
        ? "pending"
        : "completed";

    setUpdatingTaskId(task.id);
    setError("");

    try {
      const result = await updateAiraTask(task.id, {
        status: nextStatus,
      });

      if (result.task) {
        setTasks((previous) =>
          previous.map((item) =>
            item.id === task.id
              ? result.task
              : item
          )
        );
      } else {
        setTasks((previous) =>
          previous.map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  status: nextStatus,
                }
              : item
          )
        );
      }
    } catch (err) {
      console.error("[Aira Tasks] Update failed:", err);

      setError(
        err.message || "Unable to update this task."
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") {
      return (
        task.status !== "completed" &&
        task.status !== "cancelled"
      );
    }

    if (filter === "completed") {
      return task.status === "completed";
    }

    return true;
  });

  const completedCount = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const pendingCount = tasks.filter(
    (task) =>
      task.status !== "completed" &&
      task.status !== "cancelled"
  ).length;

  const formatDueDate = (value) => {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const isOverdue = (task) => {
    if (!task.due_at || task.status === "completed") {
      return false;
    }

    return new Date(task.due_at).getTime() < Date.now();
  };

  const priorityStyles = {
    low: "border-white/10 bg-white/[0.04] text-white/50",
    normal: "border-blue-400/20 bg-blue-400/10 text-blue-300",
    high: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    urgent: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-black/90 px-5 py-4 backdrop-blur-xl sm:px-7">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate?.("home")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Back to Home"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-xl font-semibold">
                Tasks
              </h1>

              <p className="mt-0.5 text-xs text-white/40">
                Stay organized with {assistantName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadTasks(true)}
              disabled={refreshing || loading}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 disabled:opacity-40"
              aria-label="Refresh tasks"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setShowForm(true);
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-black transition hover:bg-white/85"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">
                New task
              </span>
              <span className="sm:hidden">
                Add
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6 sm:px-7 sm:py-8">
        {/* Summary */}
        <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center gap-2 text-white/40">
              <ListTodo size={16} />

              <span className="text-xs">
                Total tasks
              </span>
            </div>

            <p className="text-2xl font-semibold">
              {tasks.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center gap-2 text-amber-300/70">
              <Circle size={15} />

              <span className="text-xs">
                Pending
              </span>
            </div>

            <p className="text-2xl font-semibold">
              {pendingCount}
            </p>
          </div>

          <div className="col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:col-span-1">
            <div className="mb-3 flex items-center gap-2 text-emerald-300/70">
              <CheckCircle2 size={16} />

              <span className="text-xs">
                Completed
              </span>
            </div>

            <p className="text-2xl font-semibold">
              {completedCount}
            </p>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-4">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-300"
            />

            <p className="flex-1 text-sm text-red-200">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-200/60 hover:text-red-200"
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {[
            ["all", "All tasks"],
            ["pending", "Pending"],
            ["completed", "Completed"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                filter === value
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tasks */}
        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <RefreshCw
              size={25}
              className="mb-4 animate-spin text-white/30"
            />

            <p className="text-sm text-white/50">
              Loading your tasks...
            </p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <CheckSquare
                size={25}
                className="text-white/40"
              />
            </div>

            <h2 className="text-base font-medium">
              {filter === "completed"
                ? "No completed tasks yet"
                : filter === "pending"
                  ? "You're all caught up"
                  : "No tasks yet"}
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-white/40">
              {filter === "completed"
                ? "Completed tasks will appear here."
                : filter === "pending"
                  ? "You have no pending tasks. Enjoy the breathing room!"
                  : `Create your first task and let ${assistantName} help you stay organized.`}
            </p>

            {filter !== "completed" && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-5 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/85"
              >
                <Plus size={16} />
                Create a task
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const completed =
                task.status === "completed";

              const overdue = isOverdue(task);

              const priority =
                priorityStyles[task.priority] ||
                priorityStyles.normal;

              return (
                <article
                  key={task.id}
                  className={`rounded-2xl border p-4 transition sm:p-5 ${
                    completed
                      ? "border-white/[0.05] bg-white/[0.015]"
                      : "border-white/[0.08] bg-white/[0.035] hover:border-white/[0.14]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task)}
                      disabled={
                        updatingTaskId !== null
                      }
                      className="mt-0.5 shrink-0 text-white/30 transition hover:text-white disabled:opacity-40"
                      aria-label={
                        completed
                          ? "Mark task as pending"
                          : "Mark task as completed"
                      }
                    >
                      {completed ? (
                        <CheckCircle2
                          size={22}
                          className="text-emerald-400"
                        />
                      ) : (
                        <Circle size={22} />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <h3
                        className={`break-words text-sm font-medium sm:text-base ${
                          completed
                            ? "text-white/35 line-through"
                            : "text-white/90"
                        }`}
                      >
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-white/45">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {task.priority && (
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] capitalize ${priority}`}
                          >
                            {task.priority} priority
                          </span>
                        )}

                        {task.category && (
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[11px] text-white/40">
                            {task.category}
                          </span>
                        )}
                      </div>

                      {task.due_at && (
                        <p
                          className={`mt-3 flex items-center gap-1.5 text-xs ${
                            overdue
                              ? "text-red-300"
                              : "text-white/40"
                          }`}
                        >
                          {overdue ? (
                            <AlertCircle size={14} />
                          ) : (
                            <CalendarDays size={14} />
                          )}

                          {overdue
                            ? "Overdue · "
                            : "Due · "}

                          {formatDueDate(task.due_at)}
                        </p>
                      )}

                      {completed && task.completed_at && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-300/60">
                          <CheckCircle2 size={13} />
                          Completed
                        </p>
                      )}
                    </div>

                    {updatingTaskId === task.id && (
                      <RefreshCw
                        size={16}
                        className="shrink-0 animate-spin text-white/40"
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!loading && tasks.length > 0 && (
          <p className="mt-6 text-center text-xs text-white/25">
            Your tasks are saved to your Aira account.
          </p>
        )}
      </main>

      {/* Create Task Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              resetForm();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-task-title"
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#101010] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2
                  id="create-task-title"
                  className="text-lg font-semibold"
                >
                  Create a task
                </h2>

                <p className="mt-1 text-xs text-white/40">
                  Add something you want to get done.
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                aria-label="Close form"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateTask}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="task-title"
                  className="mb-2 block text-sm text-white/65"
                >
                  Task title *
                </label>

                <input
                  id="task-title"
                  type="text"
                  required
                  maxLength={250}
                  autoFocus
                  value={form.title}
                  onChange={(event) =>
                    updateForm("title", event.target.value)
                  }
                  placeholder="e.g. Prepare project presentation"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-white/30"
                />
              </div>

              <div>
                <label
                  htmlFor="task-description"
                  className="mb-2 block text-sm text-white/65"
                >
                  Description
                </label>

                <textarea
                  id="task-description"
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(event) =>
                    updateForm(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Add more details..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-white/30"
                />
              </div>

              <div>
                <label
                  htmlFor="task-priority"
                  className="mb-2 block text-sm text-white/65"
                >
                  Priority
                </label>

                <select
                  id="task-priority"
                  value={form.priority}
                  onChange={(event) =>
                    updateForm(
                      "priority",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-3 text-base text-white outline-none focus:border-white/30"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="task-category"
                  className="mb-2 block text-sm text-white/65"
                >
                  Category
                </label>

                <input
                  id="task-category"
                  type="text"
                  maxLength={100}
                  value={form.category}
                  onChange={(event) =>
                    updateForm(
                      "category",
                      event.target.value
                    )
                  }
                  placeholder="e.g. Work, Personal, Project"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-white/30"
                />
              </div>

              <div>
                <label
                  htmlFor="task-due-date"
                  className="mb-2 block text-sm text-white/65"
                >
                  Due date
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <CalendarDays
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
                    />

                    <input
                      id="task-due-date"
                      type="date"
                      min={new Date().toLocaleDateString(
                        "en-CA"
                      )}
                      value={form.dueDate}
                      onChange={(event) =>
                        updateForm(
                          "dueDate",
                          event.target.value
                        )
                      }
                      className="w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-9 pr-2 text-base text-white outline-none focus:border-white/30"
                    />
                  </div>

                  <div className="relative">
                    <Clock
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
                    />

                    <input
                      type="time"
                      aria-label="Task due time"
                      value={form.dueTime}
                      onChange={(event) =>
                        updateForm(
                          "dueTime",
                          event.target.value
                        )
                      }
                      disabled={!form.dueDate}
                      className="w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-9 pr-2 text-base text-white outline-none focus:border-white/30 disabled:opacity-30"
                    />
                  </div>
                </div>

                <p className="mt-2 text-xs text-white/30">
                  If no time is selected, the due time will
                  default to 11:59 PM.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-white/[0.07] disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create task
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;