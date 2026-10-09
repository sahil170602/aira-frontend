import { useEffect, useRef, useState } from "react";
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
  assistantName = "Aira",
  onNavigate,
}) {
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

  useEffect(() => {
    loadConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function loadConversation() {
    let stage = "Starting Chat";

    try {
      setLoading(true);
      setError("");

      console.log("[Aira Chat] Loading conversation...");

      stage = "Authenticating user and loading conversation";
      const currentConversation =
        await getOrCreateConversation();

      console.log(
        "[Aira Chat] Conversation loaded:",
        currentConversation,
      );

      setConversation(currentConversation);

      stage = "Loading message history";
      const history = await getConversationMessages(
        currentConversation.id,
      );

      console.log(
        "[Aira Chat] Messages loaded:",
        history.length,
      );

      stage = "Preparing attachments";
      const preparedMessages = await Promise.all(
        history.map(async (message) => {
          let attachmentUrl = null;

          if (message.attachment_path) {
            try {
              attachmentUrl = await createSignedFileUrl(
                message.attachment_path,
              );
            } catch (attachmentError) {
              console.error(
                "[Aira Chat] Attachment URL failed:",
                attachmentError,
              );
            }
          }

          return {
            ...message,
            attachmentUrl,
          };
        }),
      );

      setMessages(preparedMessages);
      console.log("[Aira Chat] Chat loaded successfully.");
    } catch (err) {
      console.error("[Aira Chat] Load failed at:", stage);
      console.error("[Aira Chat] Actual error:", err);
      console.error("[Aira Chat] Error message:", err?.message);
      console.error("[Aira Chat] Error details:", err?.details);
      console.error("[Aira Chat] Error code:", err?.code);

      setError(
        `${stage}: ${err?.message || "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendTextMessage() {
    const trimmed = text.trim();

    if (!trimmed || sending || !conversation) {
      return;
    }

    try {
      setSending(true);
      setError("");

      setText("");

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

      const contextMessages = [
        ...messages,
        userMessage,
      ]
        .filter(
          (message) =>
            message.role === "user" ||
            message.role === "assistant",
        )
        .slice(-30)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const reply = await sendChatMessage(
        contextMessages,
      );

      const assistantMessage = await saveMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: reply,
        messageType: "text",
      });

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Something went wrong while sending.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendTextMessage();
    }
  }

  function openFilePicker(type) {
    setShowAttachmentMenu(false);

    if (!fileInputRef.current) {
      return;
    }

    if (type === "image") {
      fileInputRef.current.accept =
        "image/*";
    } else if (type === "video") {
      fileInputRef.current.accept =
        "video/*";
    } else if (type === "document") {
      fileInputRef.current.accept =
        ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
    } else {
      // Any file, including RAR and ZIP.
      fileInputRef.current.accept = "*/*";
    }

    fileInputRef.current.click();
  }

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !conversation) {
      return;
    }

    try {
      setSending(true);
      setError("");

      const uploaded = await uploadChatFile(
        conversation.id,
        file,
      );

      const messageType =
        file.type.startsWith("image/")
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

      const attachmentUrl =
        await createSignedFileUrl(
          uploaded.path,
        );

      setMessages((previous) => [
        ...previous,
        {
          ...savedMessage,
          attachmentUrl,
        },
      ]);
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to upload this file.",
      );
    } finally {
      setSending(false);
    }
  }

  async function sendLocation() {
    setShowAttachmentMenu(false);

    if (!conversation || sending) {
      return;
    }

    if (!navigator.geolocation) {
      setError(
        "Location is not supported on this device.",
      );
      return;
    }

    try {
      setSending(true);
      setError("");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const latitude =
              position.coords.latitude;

            const longitude =
              position.coords.longitude;

            const savedMessage =
              await saveMessage({
                conversationId:
                  conversation.id,
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
            console.error(err);

            setError(
              err?.message ||
                "Unable to save location.",
            );
          } finally {
            setSending(false);
          }
        },
        (err) => {
          console.error(err);

          setError(
            "Location permission was denied or unavailable.",
          );

          setSending(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    } catch (err) {
      console.error(err);
      setSending(false);
    }
  }

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
            Chat
          </h1>
        </div>
      </header>

      {/* Chat */}
      <main className="mx-auto flex h-[calc(100vh-90px)] max-w-4xl flex-col px-4 pb-4 sm:px-6">
        <div className="flex-1 overflow-y-auto px-1 py-4">
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-white/30">
              Loading conversation...
            </div>
          )}

          {!loading &&
            messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-white/70">
                    Talk to {assistantName}
                  </p>

                  <p className="mt-2 text-sm text-white/30">
                    Start a conversation by typing
                    below.
                  </p>
                </div>
              </div>
            )}

          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                assistantName={assistantName}
              />
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/50">
                  {assistantName} is thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            <span className="flex-1">
              {error}
            </span>

            <button
              type="button"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Composer */}
        <div className="relative">
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
                setShowAttachmentMenu(
                  (value) => !value,
                )
              }
              className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Attachments"
            >
              <Paperclip size={21} />
            </button>

            <textarea
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder={`Message ${assistantName}...`}
              rows={1}
              disabled={sending}
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
                !text.trim() || sending
              }
              className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition disabled:cursor-not-allowed disabled:opacity-20"
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

function MessageBubble({
  message,
  assistantName,
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${
        isUser
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <div
        className={`max-w-[85%] ${
          isUser
            ? "items-end"
            : "items-start"
        } flex flex-col`}
      >
        <span className="mb-1 px-2 text-[11px] text-white/30">
          {isUser ? "You" : assistantName}
        </span>

        <div
          className={`overflow-hidden rounded-2xl px-4 py-3 text-sm ${
            isUser
              ? "rounded-br-md bg-white text-black"
              : "rounded-bl-md border border-white/10 bg-white/[0.06] text-white"
          }`}
        >
          {message.message_type ===
            "image" &&
            message.attachmentUrl && (
              <img
                src={message.attachmentUrl}
                alt={
                  message.attachment_name ||
                  "Image"
                }
                className="mb-2 max-h-72 max-w-full rounded-xl object-contain"
              />
            )}

          {message.message_type ===
            "video" &&
            message.attachmentUrl && (
              <video
                src={message.attachmentUrl}
                controls
                className="mb-2 max-h-72 max-w-full rounded-xl"
              />
            )}

          {message.message_type ===
            "location" &&
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
            message.message_type !==
              "image" &&
            message.message_type !==
              "video" && (
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

          {message.message_type ===
            "voice" &&
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