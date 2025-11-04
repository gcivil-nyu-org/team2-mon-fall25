// Mock API for Message Board feature
// In production, this would make real HTTP requests to the backend

export interface Message {
  id: string;
  content: string;
  author: string;
  authorId: string; // To identify current user's messages
  timestamp: string; // ISO date string
  reactions: Reaction[];
  mentions: string[]; // Array of mentioned usernames
  isEdited: boolean;
  parentId: string | null; // null for top-level messages, message ID for replies
  replyCount: number; // Number of replies to this message
}

export interface Reaction {
  emoji: string;
  users: string[]; // Array of usernames who reacted
  count: number;
}

// Mock current user
export const CURRENT_USER = {
  id: "user-1",
  name: "You",
};

// Mock data - sample messages
const mockMessages: Message[] = [
  {
    id: "1",
    content: "Welcome to the team message board! Feel free to share updates, ask questions, or just say hi!",
    author: "Sarah Chen",
    authorId: "user-2",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    reactions: [
      { emoji: "👋", users: ["Alex Johnson", "Mike Ross"], count: 2 },
      { emoji: "🎉", users: ["Priya Nair"], count: 1 },
    ],
    mentions: [],
    isEdited: false,
    parentId: null,
    replyCount: 0,
  },
  {
    id: "2",
    content: "Hey everyone! Excited to be here. Looking forward to collaborating with you all!",
    author: "Alex Johnson",
    authorId: "user-3",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    reactions: [
      { emoji: "👍", users: ["Sarah Chen", "Mike Ross", "Priya Nair"], count: 3 },
    ],
    mentions: [],
    isEdited: false,
    parentId: null,
    replyCount: 0,
  },
  {
    id: "3",
    content: "@Sarah Chen Just finished the Q4 marketing strategy document. Can you review it when you get a chance?",
    author: "Mike Ross",
    authorId: "user-4",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    reactions: [],
    mentions: ["Sarah Chen"],
    isEdited: false,
    parentId: null,
    replyCount: 2,
  },
  {
    id: "4",
    content: "Absolutely! I'll take a look this afternoon.",
    author: "Sarah Chen",
    authorId: "user-2",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    reactions: [
      { emoji: "👍", users: ["Mike Ross"], count: 1 },
    ],
    mentions: [],
    isEdited: false,
    parentId: "3",
    replyCount: 0,
  },
  {
    id: "5",
    content: "Quick reminder: team standup at 10am tomorrow!",
    author: "Priya Nair",
    authorId: "user-5",
    timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), // 20 hours ago
    reactions: [
      { emoji: "✅", users: ["Sarah Chen", "Alex Johnson", "Mike Ross"], count: 3 },
    ],
    mentions: [],
    isEdited: false,
    parentId: null,
    replyCount: 0,
  },
  {
    id: "6",
    content: "The new feature branch is ready for testing. @Alex Johnson could you QA it before we merge?",
    author: "John Miller",
    authorId: "user-6",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    reactions: [],
    mentions: ["Alex Johnson"],
    isEdited: false,
    parentId: null,
    replyCount: 1,
  },
  {
    id: "7",
    content: "On it! Should have feedback by end of day.",
    author: "Alex Johnson",
    authorId: "user-3",
    timestamp: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    reactions: [
      { emoji: "🚀", users: ["John Miller"], count: 1 },
    ],
    mentions: [],
    isEdited: false,
    parentId: "6",
    replyCount: 0,
  },
  {
    id: "8",
    content: "Great work on the presentation today @Mike Ross! The client loved it.",
    author: "Sarah Chen",
    authorId: "user-2",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    reactions: [
      { emoji: "🎉", users: ["Mike Ross", "Priya Nair", "Alex Johnson"], count: 3 },
      { emoji: "❤️", users: ["John Miller"], count: 1 },
    ],
    mentions: ["Mike Ross"],
    isEdited: false,
    parentId: null,
    replyCount: 1,
  },
  {
    id: "9",
    content: "Thanks! Couldn't have done it without the team's input. @Sarah Chen your market research was crucial!",
    author: "Mike Ross",
    authorId: "user-4",
    timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    reactions: [
      { emoji: "👏", users: ["Sarah Chen", "Priya Nair"], count: 2 },
    ],
    mentions: ["Sarah Chen"],
    isEdited: false,
    parentId: "8",
    replyCount: 0,
  },
  {
    id: "10",
    content: "Anyone up for lunch at 12:30? There's a new sushi place down the street.",
    author: "Priya Nair",
    authorId: "user-5",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    reactions: [
      { emoji: "🍣", users: ["Alex Johnson", "Mike Ross"], count: 2 },
      { emoji: "👍", users: ["John Miller"], count: 1 },
    ],
    mentions: [],
    isEdited: false,
    parentId: null,
    replyCount: 1,
  },
  {
    id: "11",
    content: "I'm in! Count me in for sushi.",
    author: "Alex Johnson",
    authorId: "user-3",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    reactions: [],
    mentions: [],
    isEdited: false,
    parentId: "10",
    replyCount: 0,
  },
  {
    id: "12",
    content: "Quick heads up: server maintenance scheduled for tonight at 11pm. Should take about 30 minutes.",
    author: "John Miller",
    authorId: "user-6",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    reactions: [
      { emoji: "👍", users: ["Sarah Chen", "Mike Ross", "Priya Nair", "Alex Johnson"], count: 4 },
    ],
    mentions: [],
    isEdited: false,
    parentId: null,
    replyCount: 0,
  },
  {
    id: "13",
    content: "Just pushed the latest updates to staging. @Priya Nair let me know if you see any issues.",
    author: "You",
    authorId: "user-1",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    reactions: [
      { emoji: "✅", users: ["Priya Nair"], count: 1 },
    ],
    mentions: ["Priya Nair"],
    isEdited: false,
    parentId: null,
    replyCount: 1,
  },
  {
    id: "14",
    content: "Looks good so far! Testing now.",
    author: "Priya Nair",
    authorId: "user-5",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    reactions: [],
    mentions: [],
    isEdited: false,
    parentId: "13",
    replyCount: 0,
  },
  {
    id: "15",
    content: "Happy Friday everyone! 🎉 Have a great weekend!",
    author: "Sarah Chen",
    authorId: "user-2",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    reactions: [
      { emoji: "🎉", users: ["Alex Johnson", "Mike Ross", "John Miller"], count: 3 },
      { emoji: "❤️", users: ["Priya Nair"], count: 1 },
    ],
    mentions: [],
    isEdited: false,
    parentId: null,
    replyCount: 0,
  },
  {
    id: "16",
    content: "Finished reviewing it. Looks great! Just left a few minor suggestions in the doc.",
    author: "Sarah Chen",
    authorId: "user-2",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(), // Reply to message 3
    reactions: [
      { emoji: "👍", users: ["Mike Ross"], count: 1 },
    ],
    mentions: [],
    isEdited: false,
    parentId: "3",
    replyCount: 0,
  },
];

// Helper function to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Get all messages
export const getMessages = async (): Promise<Message[]> => {
  await delay(500); // Simulate network delay
  return [...mockMessages].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

// Create a new message
export const createMessage = async (
  content: string,
  mentions: string[],
  parentId: string | null = null
): Promise<Message> => {
  await delay(300);
  const newMessage: Message = {
    id: crypto.randomUUID(),
    content,
    author: CURRENT_USER.name,
    authorId: CURRENT_USER.id,
    timestamp: new Date().toISOString(),
    reactions: [],
    mentions,
    isEdited: false,
    parentId,
    replyCount: 0,
  };
  mockMessages.push(newMessage);

  // Update parent's reply count if this is a reply
  if (parentId) {
    const parentIndex = mockMessages.findIndex((m) => m.id === parentId);
    if (parentIndex !== -1) {
      mockMessages[parentIndex].replyCount++;
    }
  }

  return newMessage;
};

// Update a message
export const updateMessage = async (
  id: string,
  content: string,
  mentions: string[]
): Promise<Message> => {
  await delay(300);
  const index = mockMessages.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error("Message not found");
  }
  mockMessages[index] = {
    ...mockMessages[index],
    content,
    mentions,
    isEdited: true,
  };
  return mockMessages[index];
};

// Delete a message
export const deleteMessage = async (id: string): Promise<void> => {
  await delay(300);
  const index = mockMessages.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error("Message not found");
  }
  mockMessages.splice(index, 1);
};

// Add reaction to a message
export const addReaction = async (
  messageId: string,
  emoji: string,
  username: string
): Promise<Message> => {
  await delay(200);
  const index = mockMessages.findIndex((m) => m.id === messageId);
  if (index === -1) {
    throw new Error("Message not found");
  }

  const message = mockMessages[index];
  const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

  if (reactionIndex === -1) {
    // Add new reaction
    message.reactions.push({
      emoji,
      users: [username],
      count: 1,
    });
  } else {
    // Add user to existing reaction if not already there
    if (!message.reactions[reactionIndex].users.includes(username)) {
      message.reactions[reactionIndex].users.push(username);
      message.reactions[reactionIndex].count++;
    }
  }

  mockMessages[index] = { ...message };
  return mockMessages[index];
};

// Remove reaction from a message
export const removeReaction = async (
  messageId: string,
  emoji: string,
  username: string
): Promise<Message> => {
  await delay(200);
  const index = mockMessages.findIndex((m) => m.id === messageId);
  if (index === -1) {
    throw new Error("Message not found");
  }

  const message = mockMessages[index];
  const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

  if (reactionIndex !== -1) {
    const reaction = message.reactions[reactionIndex];
    reaction.users = reaction.users.filter((u) => u !== username);
    reaction.count = reaction.users.length;

    // Remove reaction if no users left
    if (reaction.count === 0) {
      message.reactions.splice(reactionIndex, 1);
    }
  }

  mockMessages[index] = { ...message };
  return mockMessages[index];
};

// Helper to format relative time
export const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  if (diffInSeconds < 172800) return "Yesterday";
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

// Helper to extract mentions from content
export const extractMentions = (content: string): string[] => {
  const mentionRegex = /@([A-Za-z\s]+?)(?=\s|$|[,.!?])/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1].trim());
  }

  return mentions;
};

// Available emojis for reactions
export const REACTION_EMOJIS = ["👍", "❤️", "😊", "🎉", "🚀", "👏", "🔥", "✅"];

// Get replies for a specific message
export const getReplies = async (parentId: string): Promise<Message[]> => {
  await delay(300);
  return mockMessages
    .filter((m) => m.parentId === parentId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

// Get a single message by ID
export const getMessage = async (id: string): Promise<Message | null> => {
  await delay(200);
  return mockMessages.find((m) => m.id === id) || null;
};

// Search messages by content
export const searchMessages = async (query: string): Promise<Message[]> => {
  await delay(300);
  if (!query.trim()) {
    return getMessages();
  }

  const lowerQuery = query.toLowerCase();
  return mockMessages
    .filter(
      (m) =>
        m.content.toLowerCase().includes(lowerQuery) ||
        m.author.toLowerCase().includes(lowerQuery) ||
        m.mentions.some((mention) => mention.toLowerCase().includes(lowerQuery))
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};
