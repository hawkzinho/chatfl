import { useCallback } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { MessageSquare, Hash, Loader2, Sparkles, Zap, Users } from "lucide-react";

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
  createdBy?: string;
  members: User[];
  createdAt: Date;
}

interface Friend {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
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
  onTyping?: () => void;
  replyingTo?: Message;
  onCancelReply?: () => void;
  isLoading?: boolean;
  onDeleteRoom?: (roomId: string) => Promise<void>;
  onLeaveRoom?: (roomId: string) => Promise<void>;
  onUpdateRoom?: (roomId: string, name: string, description: string) => Promise<void>;
  onRegenerateCode?: (roomId: string) => Promise<void>;
  friends?: Friend[];
  onInviteFriend?: (friendId: string) => void;
}

export function ChatView({
  room,
  messages,
  currentUserId,
  typingUsers = [],
  onSendMessage,
  onReply,
  onReact,
  onEditMessage,
  onDeleteMessage,
  onTyping,
  replyingTo,
  onCancelReply,
  isLoading,
  onDeleteRoom,
  onLeaveRoom,
  onUpdateRoom,
  onRegenerateCode,
  friends = [],
  onInviteFriend,
}: ChatViewProps) {
  const handleSend = useCallback(
    (content: string, attachments?: File[]) => {
      onSendMessage(content, attachments);
    },
    [onSendMessage]
  );

  if (!room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        
        <div className="relative z-10 text-center max-w-lg px-6">
          {/* Animated icon */}
          <div className="mb-8 inline-flex">
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl bg-gradient-primary flex items-center justify-center animate-glow-pulse">
                <MessageSquare className="w-14 h-14 text-primary-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center animate-bounce-in" style={{ animationDelay: '0.3s' }}>
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gradient mb-3 animate-fade-in">
            Welcome to ChatFlow
          </h2>
          <p className="text-lg text-muted-foreground mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Select a channel or start a conversation with a friend to begin chatting
          </p>

          {/* Feature hints */}
          <div className="grid grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="p-4 rounded-2xl glass text-center hover-lift">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                <Hash className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Channels</p>
              <p className="text-xs text-muted-foreground mt-1">Group chats</p>
            </div>
            <div className="p-4 rounded-2xl glass text-center hover-lift">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-accent/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <p className="text-sm font-medium text-foreground">Friends</p>
              <p className="text-xs text-muted-foreground mt-1">Direct messages</p>
            </div>
            <div className="p-4 rounded-2xl glass text-center hover-lift">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Real-time</p>
              <p className="text-xs text-muted-foreground mt-1">Instant delivery</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = room.createdBy === currentUserId;

  return (
    <div className="flex-1 flex flex-col bg-background h-full relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/2 to-transparent pointer-events-none" />
      
      <ChatHeader 
        room={room} 
        currentUserId={currentUserId}
        isOwner={isOwner}
        onDeleteRoom={onDeleteRoom}
        onLeaveRoom={onLeaveRoom}
        onUpdateRoom={onUpdateRoom}
        onRegenerateCode={onRegenerateCode}
      />
      
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-primary/20" />
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6">
            <div className="text-center max-w-sm animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                {room.type === 'direct' ? (
                  <MessageSquare className="w-10 h-10 text-primary" />
                ) : (
                  <Hash className="w-10 h-10 text-primary" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {room.type === 'direct' ? 'Start the conversation' : `Welcome to #${room.name}`}
              </h3>
              <p className="text-muted-foreground">
                {room.type === 'direct' 
                  ? `Send a message to start chatting with ${room.name}`
                  : room.description || 'This is the beginning of your channel. Say hello!'}
              </p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages as any}
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
      </div>
      
      <MessageInput
        onSend={handleSend}
        onTyping={onTyping}
        replyTo={replyingTo as any}
        onCancelReply={onCancelReply}
        placeholder={`Message ${room.type === 'direct' ? room.name : '#' + room.name}...`}
      />
    </div>
  );
}
