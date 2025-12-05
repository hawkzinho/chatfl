import { useState, useCallback } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { MessageCircle, Loader2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: User;
  roomId: string;
  createdAt: Date;
  updatedAt?: Date;
  isEdited?: boolean;
  reactions?: { emoji: string; users: string[] }[];
  attachments?: { id: string; type: 'image' | 'video' | 'document' | 'audio'; url: string; name: string; size: number; mimeType: string; }[];
  replyTo?: Message;
}

interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  avatar?: string;
  members: User[];
  createdAt: Date;
}

interface ChatViewProps {
  room: ChatRoom | null;
  messages: Message[];
  currentUserId: string;
  typingUsers: string[];
  onSendMessage: (content: string, attachments?: File[]) => void;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  replyingTo?: Message;
  onCancelReply?: () => void;
  isLoading?: boolean;
}

export function ChatView({
  room,
  messages,
  currentUserId,
  typingUsers,
  onSendMessage,
  onReply,
  onReact,
  onEditMessage,
  onDeleteMessage,
  replyingTo,
  onCancelReply,
  isLoading,
}: ChatViewProps) {
  const handleSend = useCallback(
    (content: string, attachments?: File[]) => {
      onSendMessage(content, attachments);
    },
    [onSendMessage]
  );

  if (!room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
          <MessageCircle className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Welcome to ChatFlow</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Select a channel or start a conversation to begin chatting
        </p>
      </div>
    );
  }

  // Transform messages to include sender as User type
  const transformedMessages = messages.map(m => ({
    ...m,
    sender: {
      ...m.sender,
      status: m.sender.status as 'online' | 'offline' | 'away' | 'busy'
    }
  }));

  // Transform room members
  const transformedRoom = {
    ...room,
    members: room.members.map(m => ({
      ...m,
      status: m.status as 'online' | 'offline' | 'away' | 'busy'
    }))
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <ChatHeader room={transformedRoom} currentUserId={currentUserId} />
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <MessageList
          messages={transformedMessages as any}
          currentUserId={currentUserId}
          typingUsers={typingUsers}
          onReply={onReply as any}
          onEdit={onEditMessage ? (msg: any) => {
            const newContent = prompt('Edit message:', msg.content);
            if (newContent && newContent !== msg.content) {
              onEditMessage(msg.id, newContent);
            }
          } : undefined}
          onDelete={onDeleteMessage ? (msg: any) => {
            if (confirm('Delete this message?')) {
              onDeleteMessage(msg.id);
            }
          } : undefined}
          onReact={onReact}
        />
      )}
      
      <MessageInput
        onSend={handleSend}
        onTyping={() => {}}
        replyTo={replyingTo as any}
        onCancelReply={onCancelReply}
        placeholder={`Message ${room.type === 'direct' ? '' : '#' + room.name}`}
      />
    </div>
  );
}
