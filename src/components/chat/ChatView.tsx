import { useCallback } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { MessageSquare, Hash, Loader2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
}

interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  name: string;
  size: number;
  mimeType: string;
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
  attachments?: Attachment[];
  reactions?: { emoji: string; users: string[] }[];
  replyTo?: Message;
}

interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  avatar?: string;
  inviteCode?: string;
  members: User[];
  createdAt: Date;
}

interface ChatViewProps {
  room: ChatRoom | null;
  messages: Message[];
  currentUserId: string;
  typingUsers?: string[];
  onSendMessage: (content: string, files?: File[]) => void;
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
      <div className="flex-1 flex flex-col items-center justify-center bg-background/50">
        <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Welcome to ChatFlow
        </h3>
        <p className="text-muted-foreground text-center max-w-md px-4">
          Select a channel or start a conversation with a friend to begin chatting
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background/50 h-full">
      <ChatHeader room={room} currentUserId={currentUserId} />
      
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              {room.type === 'direct' ? (
                <MessageSquare className="w-8 h-8 text-primary" />
              ) : (
                <Hash className="w-8 h-8 text-primary" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {room.type === 'direct' ? 'Start a conversation' : `Welcome to #${room.name}`}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {room.type === 'direct' 
                ? 'Send a message to start chatting'
                : room.description || 'This is the beginning of your channel. Say hello!'}
            </p>
          </div>
        ) : (
          <MessageList
            messages={messages as any}
            currentUserId={currentUserId}
            typingUsers={[]}
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
      </div>
      
      <MessageInput
        onSend={handleSend}
        replyTo={replyingTo as any}
        onCancelReply={onCancelReply}
        placeholder={`Message ${room.type === 'direct' ? room.name : '#' + room.name}...`}
      />
    </div>
  );
}