import { supabase } from "../lib/supabase";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://aira-ai-backend.sahilmeshram1917.workers.dev"
).replace(/\/+$/, "");

/**
 * Get the current signed-in user's Supabase session.
 *
 * The access token allows the Worker to access the user's own
 * data through Supabase Row Level Security (RLS).
 */
async function getAuthenticatedSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(
      `Unable to verify your login session: ${error.message}`
    );
  }

  return session;
}

/**
 * Send a message to Aira's Cloudflare AI backend.
 *
 * assistantName, assistantGender and personality should come
 * from the signed-in user's saved aira_settings record.
 *
 * A valid Supabase session enables authenticated memory access.
 */
export async function sendChatMessage(
  messages,
  {
    assistantName,
    assistantGender,
    personality = "friendly_caring",
    userName = "",
  } = {}
) {
  // Validate messages.
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Please enter a message.");
  }

  // Validate assistant name.
  const configuredName =
    typeof assistantName === "string"
      ? assistantName.trim()
      : "";

  if (!configuredName) {
    throw new Error(
      "Your assistant name is missing. Please open Settings and save your assistant name."
    );
  }

  // Validate assistant gender.
  const normalizedGender =
    typeof assistantGender === "string"
      ? assistantGender.trim().toLowerCase()
      : "";

  if (
    normalizedGender !== "female" &&
    normalizedGender !== "male"
  ) {
    throw new Error(
      "Your assistant gender is missing. Please select and save your assistant gender in Settings."
    );
  }

  // Validate personality.
  const allowedPersonalities = [
    "friendly_caring",
    "funny",
    "professional",
    "motivational",
    "calm",
    "romantic",
  ];

  const normalizedPersonality =
    typeof personality === "string"
      ? personality.trim().toLowerCase()
      : "friendly_caring";

  if (!allowedPersonalities.includes(normalizedPersonality)) {
    throw new Error(
      "Invalid assistant personality. Please select a valid personality in Settings."
    );
  }

  // Normalize and validate messages.
  const normalizedMessages = messages.map((message) => {
    if (
      !message ||
      !["user", "assistant"].includes(message.role) ||
      typeof message.content !== "string"
    ) {
      throw new Error(
        "A chat message has an invalid format."
      );
    }

    const content = message.content.trim();

    if (!content) {
      throw new Error(
        "A chat message cannot be empty."
      );
    }

    return {
      role: message.role,
      content,
    };
  });

  try {
    // Retrieve the authenticated Supabase session.
    const session = await getAuthenticatedSession();

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    /*
     * Send the signed-in user's JWT to the Worker.
     *
     * The Worker uses this token to authenticate the user
     * and retrieve or save memories under Supabase RLS.
     */
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        assistantName: configuredName,
        assistantGender: normalizedGender,
        personality: normalizedPersonality,
        userName:
          typeof userName === "string"
            ? userName.trim()
            : "",
        messages: normalizedMessages,
      }),
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `The AI server returned an invalid response (${response.status}).`
      );
    }

    if (!response.ok || data.success === false) {
      console.error("Aira backend error:", {
        status: response.status,
        data,
      });

      throw new Error(
        data.error ||
          `AI request failed (${response.status}).`
      );
    }

    if (
      typeof data.reply !== "string" ||
      !data.reply.trim()
    ) {
      throw new Error(
        "The AI server returned an empty reply."
      );
    }

    return data.reply.trim();
  } catch (error) {
    console.error("Aira chat error:", error);

    if (error instanceof TypeError) {
      throw new Error(
        "Cannot connect to Aira's AI server. Check your internet connection, API URL, and Cloudflare Worker CORS settings."
      );
    }

    throw error;
  }
}

/**
 * Get the user's saved memories.
 *
 * Returns an array of memories belonging to the authenticated user.
 */
export async function getAiraMemories() {
  return authenticatedRequest("/api/memories", {
    method: "GET",
  });
}

/**
 * Save a long-term memory for Aira.
 *
 * Example:
 * saveAiraMemory({
 *   memory: "I prefer replies in Roman Hindi.",
 *   category: "preference",
 *   importance: 8
 * });
 */
export async function saveAiraMemory({
  memory,
  category = "preference",
  importance = 5,
}) {
  if (typeof memory !== "string" || !memory.trim()) {
    throw new Error("Memory text is required.");
  }

  return authenticatedRequest("/api/memories", {
    method: "POST",
    body: {
      memory: memory.trim(),
      category,
      importance,
    },
  });
}

/**
 * Deactivate a saved memory.
 */
export async function deleteAiraMemory(memoryId) {
  if (!memoryId) {
    throw new Error("Memory ID is required.");
  }

  return authenticatedRequest(
    `/api/memories/${encodeURIComponent(memoryId)}`,
    {
      method: "DELETE",
    }
  );
}

/**
 * Get the user's tasks.
 */
export async function getAiraTasks() {
  return authenticatedRequest("/api/tasks", {
    method: "GET",
  });
}

/**
 * Create a task.
 *
 * due_at must be a valid date/time string or null.
 */
export async function createAiraTask({
  title,
  description = "",
  priority = "normal",
  due_at = null,
  category = "general",
  recurring = false,
  recurrence_rule = null,
}) {
  if (typeof title !== "string" || !title.trim()) {
    throw new Error("Task title is required.");
  }

  return authenticatedRequest("/api/tasks", {
    method: "POST",
    body: {
      title: title.trim(),
      description,
      priority,
      due_at,
      category,
      recurring,
      recurrence_rule,
    },
  });
}

/**
 * Update a task's status or supported fields.
 */
export async function updateAiraTask(taskId, updates) {
  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  return authenticatedRequest(
    `/api/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      body: updates,
    }
  );
}

/**
 * Get the user's reminders.
 */
export async function getAiraReminders() {
  return authenticatedRequest("/api/reminders", {
    method: "GET",
  });
}

/**
 * Create a reminder.
 *
 * remind_at must be a valid future ISO date/time string.
 *
 * Saving the reminder does not itself schedule a phone alarm
 * or send a push notification.
 */
export async function createAiraReminder({
  title,
  description = "",
  remind_at,
  recurring = false,
  recurrence_rule = null,
}) {
  if (typeof title !== "string" || !title.trim()) {
    throw new Error("Reminder title is required.");
  }

  if (
    typeof remind_at !== "string" ||
    Number.isNaN(Date.parse(remind_at))
  ) {
    throw new Error(
      "A valid reminder date and time are required."
    );
  }

  return authenticatedRequest("/api/reminders", {
    method: "POST",
    body: {
      title: title.trim(),
      description,
      remind_at,
      recurring,
      recurrence_rule,
    },
  });
}

/**
 * Shared authenticated API request helper.
 *
 * All memory, task and reminder requests use the current
 * Supabase access token rather than trusting a userId from
 * the frontend request body.
 */
async function authenticatedRequest(path, options = {}) {
  try {
    const session = await getAuthenticatedSession();

    if (!session?.access_token) {
      throw new Error(
        "Please sign in to use Aira's memories, tasks and reminders."
      );
    }

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };

    const requestOptions = {
      method: options.method || "GET",
      headers,
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(
      `${API_URL}${path}`,
      requestOptions
    );

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `The server returned an invalid response (${response.status}).`
      );
    }

    if (!response.ok || data.success === false) {
      console.error("Aira API error:", {
        path,
        status: response.status,
        data,
      });

      throw new Error(
        data.error ||
          `Request failed (${response.status}).`
      );
    }

    return data;
  } catch (error) {
    console.error(`Aira request failed (${path}):`, error);

    if (error instanceof TypeError) {
      throw new Error(
        "Cannot connect to Aira's backend. Check your internet connection and Worker URL."
      );
    }

    throw error;
  }
}