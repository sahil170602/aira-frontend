import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  MapPin,
  Paperclip,
  Send,
  Video,
  X,
} from "lucide-react";

import {
  createSignedFileUrl,
  getConversationMessages,
  getOrCreateConversation,
  saveMessage,
  uploadChatFile,
} from "../services/conversationService";

import { sendChatMessage } from "../services/chatService";

function Chat({
  assistantName,
  assistantGender,
  onNavigate,
}) {
  // These values must come from the signed-in user's saved settings.
  const displayAssistantName =
    typeof assistantName === "string"
      ? assistantName.trim()
      : "";

  const normalizedGender =
    typeof assistantGender === "string"
      ? assistantGender.trim().toLowerCase()
      : "";

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] =
    useState(false);

  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  /*
   * Load the conversation.
   */
  const loadConversation = useCallback(async () => {
    let stage = "Starting chat";

    try {
      setLoading(true);
      setError("");

      console.log("[Aira Chat] Loading conversation...");

      stage = "Authenticating user and loading conversation";

      const currentConversation =
        await getOrCreateConversation();

      if (!currentConversation?.id) {
        throw new Error(
          "Could not create or load your conversation."
        );
      }

      console.log(
        "[Aira Chat] Conversation loaded:",
        currentConversation
      );

      setConversation(currentConversation);

      stage = "Loading message history";

      const history = await getConversationMessages(
        currentConversation.id
      );

      console.log(
        "[Aira Chat] Messages loaded:",
        history.length
      );

      stage = "Preparing attachments";

      const preparedMessages = await Promise.all(
        history.map(async (message) => {
          let attachmentUrl = null;

          if (message.attachment_path) {
            try {
              attachmentUrl = await createSignedFileUrl(
                message.attachment_path
              );
            } catch (attachmentError) {
              console.error(
                "[Aira Chat] Attachment URL failed:",
                attachmentError
              );
            }
          }

          return {
            ...message,
            attachmentUrl,
          };
        })
      );

      setMessages(preparedMessages);

      console.log(
        "[Aira Chat] Chat loaded successfully."
      );
    } catch (err) {
      console.error(
        "[Aira Chat] Load failed at:",
        stage
      );

      console.error(
        "[Aira Chat] Actual error:",
        err
      );

      setError(
        `${stage}: ${
          err?.message || "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  /*
   * Scroll to the newest message.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, sending]);

  /*
   * Send a text message to Aira.
   */
  async function sendTextMessage() {
    const trimmed = text.trim();

    if (
      !trimmed ||
      sending ||
      loading ||
      !conversation
    ) {
      return;
    }

    if (!displayAssistantName) {
      setError(
        "Your assistant name has not loaded. Open Settings, save your assistant name, and try again."
      );
      return;
    }

    if (
      normalizedGender !== "female" &&
      normalizedGender !== "male"
    ) {
      setError(
        "Your assistant gender has not loaded. Open Settings, select Female or Male, save your settings, and try again."
      );
      return;
    }

    try {
      setSending(true);
      setError("");
      setShowAttachmentMenu(false);
      setText("");

      /*
       * Save the user's message first.
       */
      const userMessage = await saveMessage({
        conversationId: conversation.id,
        role: "user",
        content: trimmed,
        messageType: "text",
      });

      setMessages((previous) => [
        ...previous,
        userMessage,
      ]);

      /*
       * Build the recent conversation history.
       * Only user and assistant text messages are sent
       * to the language model.
       */
      const conversationHistory = [
        ...messages,
        userMessage,
      ]
        .filter(
          (message) =>
            (message.role === "user" ||
              message.role === "assistant") &&
            typeof message.content === "string" &&
            message.content.trim()
        )
        .slice(-30)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      /*
       * IMPORTANT:
       * The name and gender are sent as request options.
       * Do not insert configuration markers into chat history.
       */
      console.log("[Aira Chat] Sending message:", {
        assistantName: displayAssistantName,
        assistantGender: normalizedGender,
        messageCount: conversationHistory.length,
      });

      const reply = await sendChatMessage(
        conversationHistory,
        {
          assistantName: displayAssistantName,
          assistantGender: normalizedGender,
        }
      );

      if (
        typeof reply !== "string" ||
        !reply.trim()
      ) {
        throw new Error(
          "Aira returned an empty response. Please try again."
        );
      }

      /*
       * Save the AI response to Supabase.
       */
      const assistantMessage = await saveMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: reply.trim(),
        messageType: "text",
      });

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (err) {
      console.error("[Aira Chat] Send failed:", err);

      setError(
        err?.message ||
          "Something went wrong while sending your message."
      );
    } finally {
      setSending(false);
    }
  }

  /*
   * Enter sends; Shift + Enter creates a new line.
   */
  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent?.isComposing
    ) {
      event.preventDefault();
      sendTextMessage();
    }
  }

  /*
   * Open the file picker for an attachment type.
   */
  function openFilePicker(type) {
    setShowAttachmentMenu(false);

    if (!fileInputRef.current) {
      return;
    }

    if (type === "image") {
      fileInputRef.current.accept = "image/*";
    } else if (type === "video") {
      fileInputRef.current.accept = "video/*";
    } else if (type === "document") {
      fileInputRef.current.accept =
        ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
    } else {
      fileInputRef.current.accept = "*/*";
    }

    fileInputRef.current.click();
  }

  /*
   * Upload an attachment and save its message.
   */
  async function handleFileSelected(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !conversation || sending) {
      return;
    }

    try {
      setSending(true);
      setError("");
      setShowAttachmentMenu(false);

      const uploaded = await uploadChatFile(
        conversation.id,
        file
      );

      const messageType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "file";

      const savedMessage = await saveMessage({
        conversationId: conversation.id,
        role: "user",
        content: file.name,
        messageType,
        attachmentPath: uploaded.path,
        attachmentName: uploaded.name,
        attachmentType: uploaded.type,
        attachmentSize: uploaded.size,
      });

      let attachmentUrl = null;

      try {
        attachmentUrl = await createSignedFileUrl(
          uploaded.path
        );
      } catch (urlError) {
        console.error(
          "[Aira Chat] Could not create attachment URL:",
          urlError
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          ...savedMessage,
          attachmentUrl,
        },
      ]);
    } catch (err) {
      console.error(
        "[Aira Chat] Attachment upload failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to upload this file."
      );
    } finally {
      setSending(false);
    }
  }

  /*
   * Share the user's current location.
   */
  async function sendLocation() {
    setShowAttachmentMenu(false);

    if (!conversation || sending) {
      return;
    }

    if (!navigator.geolocation) {
      setError(
        "Location is not supported on this device."
      );
      return;
    }

    setSending(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          const savedMessage = await saveMessage({
            conversationId: conversation.id,
            role: "user",
            content: "Shared location",
            messageType: "location",
            latitude,
            longitude,
          });

          setMessages((previous) => [
            ...previous,
            savedMessage,
          ]);
        } catch (err) {
          console.error(
            "[Aira Chat] Location save failed:",
            err
          );

          setError(
            err?.message ||
              "Unable to save your location."
          );
        } finally {
          setSending(false);
        }
      },
      (err) => {
        console.error(
          "[Aira Chat] Location error:",
          err
        );

        setError(
          "Location permission was denied or the location is unavailable."
        );

        setSending(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  /*
   * Navigate back to the home screen.
   */
  function handleBack() {
    onNavigate?.("home");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-5 sm:px-7">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Back to Home"
        >
          <ArrowLeft size={19} />
        </button>

        <div>
          <h1 className="text-xl font-semibold">
            Chat
          </h1>

          {displayAssistantName && (
            <p className="mt-0.5 text-xs text-white/35">
              Chatting with {displayAssistantName}
            </p>
          )}
        </div>
      </header>

      {/* Chat content */}
      <main
        className="mx-auto flex h-[calc(100dvh-90px)] max-w-4xl flex-col px-4 pb-4 sm:px-6"
      >
        {/* Message list */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-4"
          aria-live="polite"
        >
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-white/30">
              Loading conversation...
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-white/70">
                  Talk to{" "}
                  {displayAssistantName ||
                    "your assistant"}
                </p>

                <p className="mt-2 text-sm text-white/30">
                  Start a conversation by typing below.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                assistantName={displayAssistantName}
              />
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/50">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />

                    {displayAssistantName ||
                      "Your assistant"}{" "}
                    is thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-3 flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
          >
            <span className="flex-1 break-words">
              {error}
            </span>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 rounded-full p-1 hover:bg-white/10"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Composer */}
        <div className="relative shrink-0">
          {showAttachmentMenu && (
            <div className="absolute bottom-16 left-0 z-20 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#151515] p-2 shadow-2xl">
              <AttachmentButton
                icon={<ImageIcon size={19} />}
                label="Photo"
                onClick={() =>
                  openFilePicker("image")
                }
              />

              <AttachmentButton
                icon={<Video size={19} />}
                label="Video"
                onClick={() =>
                  openFilePicker("video")
                }
              />

              <AttachmentButton
                icon={<FileText size={19} />}
                label="Document"
                onClick={() =>
                  openFilePicker("document")
                }
              />

              <AttachmentButton
                icon={<Paperclip size={19} />}
                label="File / RAR / ZIP"
                onClick={() =>
                  openFilePicker("file")
                }
              />

              <AttachmentButton
                icon={<MapPin size={19} />}
                label="Location"
                onClick={sendLocation}
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelected}
          />

          <div className="flex items-end gap-2 rounded-3xl border border-white/10 bg-white/[0.05] p-2">
            <button
              type="button"
              onClick={() =>
                setShowAttachmentMenu((value) => !value)
              }
              className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Attachments"
              disabled={sending || loading}
            >
              <Paperclip size={21} />
            </button>

            <textarea
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder={`Message ${
                displayAssistantName || "your assistant"
              }...`}
              rows={1}
              disabled={sending || loading}
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-base text-white outline-none placeholder:text-white/30"
              style={{
                fontSize: "16px",
                WebkitTextSizeAdjust: "100%",
              }}
            />

            <button
              type="button"
              onClick={sendTextMessage}
              disabled={
                !text.trim() ||
                sending ||
                loading ||
                !conversation
              }
              className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-20"
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

/*
 * Attachment menu item.
 */
function AttachmentButton({
  icon,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/*
 * Message bubble.
 */
function MessageBubble({
  message,
  assistantName,
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`flex max-w-[85%] flex-col ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <span className="mb-1 px-2 text-[11px] text-white/30">
          {isUser ? "You" : assistantName || "Assistant"}
        </span>

        <div
          className={`overflow-hidden rounded-2xl px-4 py-3 text-sm ${
            isUser
              ? "rounded-br-md bg-white text-black"
              : "rounded-bl-md border border-white/10 bg-white/[0.06] text-white"
          }`}
        >
          {message.message_type === "image" &&
            message.attachmentUrl && (
              <img
                src={message.attachmentUrl}
                alt={message.attachment_name || "Image"}
                className="mb-2 max-h-72 max-w-full rounded-xl object-contain"
              />
            )}

          {message.message_type === "video" &&
            message.attachmentUrl && (
              <video
                src={message.attachmentUrl}
                controls
                playsInline
                className="mb-2 max-h-72 max-w-full rounded-xl"
              />
            )}

          {message.message_type === "location" &&
            message.latitude != null &&
            message.longitude != null && (
              <a
                href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mb-2 flex items-center gap-2 underline"
              >
                <MapPin size={17} />
                Shared location
              </a>
            )}

          {message.attachment_name &&
            message.message_type !== "image" &&
            message.message_type !== "video" && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2">
                <FileText size={18} />

                <span className="break-all">
                  {message.attachment_name}
                </span>
              </div>
            )}

          {message.content && (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {message.message_type === "voice" &&
            message.transcription && (
              <div className="whitespace-pre-wrap">
                {message.transcription}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default Chat;