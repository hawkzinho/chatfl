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
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <div className="text-center max-w-lg px-6">
          <div className="mb-6 inline-flex">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-primary" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-2">
            Bem-vindo ao ChatFlow
          </h2>
          <p className="text-muted-foreground">
            Selecione um canal ou comece uma conversa com um amigo
          </p>
        </div>
      </div>
    );
  }

  const isOwner = room.createdBy === currentUserId;

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      <ChatHeader 
        room={room} 
        currentUserId={currentUserId}
        isOwner={isOwner}
        onDeleteRoom={onDeleteRoom}
        onLeaveRoom={onLeaveRoom}
        onUpdateRoom={onUpdateRoom}
        onRegenerateCode={onRegenerateCode}
      />
      
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-muted flex items-center justify-center">
                {room.type === 'direct' ? (
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Hash className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {room.type === 'direct' ? 'Comece a conversa' : `Bem-vindo ao #${room.name}`}
              </h3>
              <p className="text-muted-foreground text-sm">
                {room.type === 'direct' 
                  ? `Envie uma mensagem para ${room.name}`
                  : room.description || 'Este é o início do canal. Diga olá!'}
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
              const newContent = prompt('Editar mensagem:', msg.content);
              if (newContent && newContent !== msg.content) {
                onEditMessage(msg.id, newContent);
              }
            } : undefined}
            onDelete={onDeleteMessage ? (msg: any) => {
              if (confirm('Excluir esta mensagem?')) {
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
        placeholder={`Mensagem ${room.type === 'direct' ? room.name : '#' + room.name}...`}
      />
    </div>
  );
}