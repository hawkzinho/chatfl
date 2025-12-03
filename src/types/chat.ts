export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

export interface User {
  id: string;
  username: string;
  avatar?: string;
  status: UserStatus;
  lastSeen?: Date;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: User;
  roomId: string;
  createdAt: Date;
  updatedAt?: Date;
  isEdited?: boolean;
  reactions?: Reaction[];
  attachments?: Attachment[];
  replyTo?: Message;
  readBy?: string[];
}

export interface Reaction {
  emoji: string;
  users: string[];
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'audio';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  avatar?: string;
  members: User[];
  lastMessage?: Message;
  unreadCount?: number;
  createdAt: Date;
  createdBy?: string;
}

export interface TypingIndicator {
  roomId: string;
  userId: string;
  username: string;
}
