import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Helper to get workspace ID from localStorage
const getWorkspaceId = (): string | null => {
  return localStorage.getItem("workspace_id") || localStorage.getItem("cd.workspace");
};

// Helper to build headers with auth and workspace context
const buildHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const workspaceId = getWorkspaceId();
  if (workspaceId) {
    headers["X-Workspace-ID"] = workspaceId;
  }

  return headers;
};

export interface Message {
  id: string;
  content: string;
  author: string;
  authorId: string;
  authorEmail: string;
  timestamp: string;
  reactions: Reaction[];
  mentions: string[];
  isEdited: boolean;
  parentId: string | null;
  replyCount: number;
}

export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

// ======================
// API Wrapper Functions
// ======================

// Get all top-level messages
export const getMessages = async (token?: string): Promise<Message[]> => {
  const { data } = await axios.get(`${API_URL}/api/messageboard/messages/`, {
    headers: buildHeaders(token),
  });
  return data.map(transformMessage);
};

// Get a single message (can include replies)
export const getMessage = async (id: string, token?: string): Promise<Message | null> => {
  try {
    const { data } = await axios.get(`${API_URL}/api/messageboard/messages/${id}/`, {
      headers: buildHeaders(token),
    });
    return transformMessage(data);
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
};

// Get replies for a specific message
export const getReplies = async (parentId: string, token?: string): Promise<Message[]> => {
  try {
    const { data } = await axios.get(`${API_URL}/api/messageboard/messages/${parentId}/`, {
      headers: buildHeaders(token),
    });
    return (data.replies || [])
      .map(transformMessage)
      .sort((a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return [];
    throw err;
  }
};

// Create a new message (or reply)
export const createMessage = async (
  content: string,
  mentions: string[],
  parentId: string | null = null,
  token?: string
): Promise<Message> => {
  const { data } = await axios.post(
    `${API_URL}/api/messageboard/messages/`,
    { content, mentions, parent: parentId },
    { headers: buildHeaders(token) }
  );

  return transformMessage(data);
};

// Update a message
export const updateMessage = async (
  id: string,
  content: string,
  mentions: string[],
  token?: string
): Promise<Message> => {
  const { data } = await axios.patch(
    `${API_URL}/api/messageboard/messages/${id}/`,
    { content, mentions },
    { headers: buildHeaders(token) }
  );
  return transformMessage(data);
};

// Delete a message
export const deleteMessage = async (
  id: string,
  token?: string
): Promise<void> => {
  await axios.delete(
    `${API_URL}/api/messageboard/messages/${id}/`,
    { headers: buildHeaders(token) }
  );
};

export const addReaction = async (
  messageId: string,
  reactionType: string,
  token?: string
): Promise<Message> => {
  const payload = { emoji: reactionType };
  const { data } = await axios.post(
    `${API_URL}/api/messageboard/messages/${messageId}/react/`,
    payload,
    { headers: buildHeaders(token) }
  );

  return transformMessage(data);
};

export const removeReaction = async (
  messageId: string,
  reactionType: string,
  token?: string
): Promise<Message> => {
  const payload = { emoji: reactionType, action: "remove" };
  const { data } = await axios.post(
    `${API_URL}/api/messageboard/messages/${messageId}/react/`,
    payload,
    { headers: buildHeaders(token) }
  );

  return transformMessage(data);
};

// Search messages by content or author
export const searchMessages = async (query: string, token?: string): Promise<Message[]> => {
  if (!query.trim()) return getMessages(token);
  const { data } = await axios.get(`${API_URL}/api/messageboard/messages/`, {
    params: { search: query },
    headers: buildHeaders(token),
  });
  return data.map(transformMessage);
};

// ======================
// Helper Functions
// ======================

// Transform backend message format to frontend format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformMessage = (msg: any): Message => {
  const authorEmail = msg.user?.name || "unknown@example.com";
  const authorId = msg.user?.id.toString() || "unknown";
  const createdTime = new Date(msg.createdAt).getTime();
  const updatedTime = new Date(msg.updatedAt).getTime();

  return ({
    id: msg.id.toString(),
    content: msg.content,
    author: authorEmail,
    authorId: authorId,
    authorEmail: authorEmail,
    timestamp: msg.createdAt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reactions: (msg.reactions || []).map((r: any) => ({
      emoji: r.emoji,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      users: (r.users || []).map((u: any) => u.id.toString()),
      count: (r.users || []).length,
    })),
    mentions: extractMentions(msg.content),
    isEdited: updatedTime > createdTime, 
    parentId: msg.parent ? msg.parent.toString() : null,
    replyCount: msg.replies ? msg.replies.length : 0,
  });
};

// Extract @mentions from message content
export const extractMentions = (content: string): string[] => {
  const mentionRegex = /@([A-Za-z\s]+?)(?=\s|$|[,.!?])/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1].trim());
  }
  return mentions;
};

// Format relative time (same as your mock)
export const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return "Yesterday";
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

// Available reaction emojis
export const REACTION_EMOJIS = ["👍", "❤️", "😊", "🎉", "🚀", "👏", "🔥", "✅"];

