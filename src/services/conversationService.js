import { supabase } from "../lib/supabase";

/**
 * Get the currently authenticated user.
 */
export async function getCurrentUser() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(
      `Session error: ${sessionError.message}`,
    );
  }

  if (!session?.user) {
    throw new Error(
      "Your session has expired. Please log in again.",
    );
  }

  return session.user;
}

/**
 * Load the most recently updated conversation.
 * Create one if the user has none.
 */
export async function getOrCreateConversation() {
  const user = await getCurrentUser();

  const {
    data: existingConversation,
    error: existingError,
  } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Conversation loading failed: ${existingError.message}`,
    );
  }

  if (existingConversation) {
    return existingConversation;
  }

  const {
    data: newConversation,
    error: createError,
  } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      title: "New conversation",
    })
    .select()
    .single();

  if (createError) {
    throw new Error(
      `Conversation creation failed: ${createError.message}`,
    );
  }

  return newConversation;
}

/**
 * Load all messages belonging to a conversation.
 */
export async function getConversationMessages(
  conversationId,
) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Message history loading failed: ${error.message}`,
    );
  }

  return data || [];
}

/**
 * Save a text, voice, location, or attachment message.
 */
export async function saveMessage({
  conversationId,
  role,
  content = "",
  messageType = "text",
  attachmentPath = null,
  attachmentName = null,
  attachmentType = null,
  attachmentSize = null,
  transcription = null,
  latitude = null,
  longitude = null,
  metadata = {},
  durationMs = null,
}) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role,
      content,
      message_type: messageType,
      attachment_path: attachmentPath,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
      attachment_size: attachmentSize,
      transcription,
      latitude,
      longitude,
      metadata,
      duration_ms: durationMs,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Saving message failed: ${error.message}`,
    );
  }

  // Update conversation timestamp.
  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error(
      "Conversation timestamp update failed:",
      updateError.message,
    );
  }

  return data;
}

/**
 * Upload an attachment to private Supabase Storage.
 */
export async function uploadChatFile(
  conversationId,
  file,
) {
  const user = await getCurrentUser();

  const safeName = file.name.replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );

  const uniqueName = [
    Date.now(),
    crypto.randomUUID(),
    safeName,
  ].join("-");

  const path =
    `${user.id}/${conversationId}/${uniqueName}`;

  const { error } = await supabase.storage
    .from("aira-chat-files")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType:
        file.type || "application/octet-stream",
    });

  if (error) {
    throw new Error(
      `File upload failed: ${error.message}`,
    );
  }

  return {
    path,
    name: file.name,
    type:
      file.type || "application/octet-stream",
    size: file.size,
  };
}

/**
 * Generate a temporary URL for a private attachment.
 */
export async function createSignedFileUrl(path) {
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from("aira-chat-files")
    .createSignedUrl(path, 3600);

  if (error) {
    throw new Error(
      `Opening attachment failed: ${error.message}`,
    );
  }

  return data?.signedUrl || null;
}