import { useCallback, useState, useEffect } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ActiveCallBanner } from "./ActiveCallBanner";
import { VoiceCallScreen } from "./VoiceCallScreen";
import { MessageSquare, Hash, Loader2 } from "lucide-react";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { useVoiceCallContext } from "@/contexts/VoiceCallContext";

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
  type: 'public' | 'private';
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
  currentUsername?: string;
  currentUserRole?: 'owner' | 'admin' | 'member';
  typingUsers?: string[];
  onSendMessage: (content: string, files?: File[]) => void;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string, isAdmin?: boolean) => void;
  onTyping?: () => void;
  replyingTo?: Message;
  onCancelReply?: () => void;
  isLoading?: boolean;
  onDeleteRoom?: (roomId: string) => Promise<void>;
  onLeaveRoom?: (roomId: string) => Promise<void>;
  onUpdateRoom?: (roomId: string, name: string, description: string, avatarUrl?: string) => Promise<void>;
  onRegenerateCode?: (roomId: string) => Promise<void>;
  onRemoveMember?: (roomId: string, userId: string) => Promise<void>;
  onUpdateMemberRole?: (roomId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
  friends?: Friend[];
  onInviteFriend?: (friendId: string) => void;
}

export function ChatView({
  room,
  messages,
  currentUserId,
  currentUsername,
  currentUserRole,
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
  onRemoveMember,
  onUpdateMemberRole,
  friends = [],
  onInviteFriend,
}: ChatViewProps) {
  const [isJoiningCall, setIsJoiningCall] = useState(false);
  const voiceCallContext = useVoiceCallContext();
  
  // Use voice call hook for the active room
  const {
    isInCall,
    isMuted,
    isScreenSharing,
    remoteScreenShares,
    participants,
    callDuration,
    hasActiveCall,
    callStarterName,
    joinCall,
    leaveCall,
    toggleMute,
    startScreenShare,
    stopScreenShare,
  } = useVoiceCall(room?.id || null);

  // Sync call state with global context for ALL participants (not just creator)
  useEffect(() => {
    if (isInCall && room) {
      voiceCallContext.setCallState({
        isInCall: true,
        roomId: room.id,
        roomName: room.name,
        isMuted,
        callDuration,
      });
      // Store call function references for global minimized bar
      voiceCallContext.callFunctionsRef.current = {
        toggleMute,
        leaveCall,
      };
    }
  }, [isInCall, room, isMuted, callDuration, toggleMute, leaveCall]);

  // Check if currently in this room's call (not minimized)
  const showCallScreen = isInCall && !voiceCallContext.isMinimized;

  const handleSend = useCallback(
    (content: string, attachments?: File[]) => {
      onSendMessage(content, attachments);
    },
    [onSendMessage]
  );

  const handleJoinCall = async () => {
    setIsJoiningCall(true);
    await joinCall();
    setIsJoiningCall(false);
  };

  const handleLeaveCall = async () => {
    await leaveCall();
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

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
            Selecione um canal para começar a conversar
          </p>
        </div>
      </div>
    );
  }

  const isOwner = room.createdBy === currentUserId;
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner' || isOwner;
  // Show full-screen call interface when in call and not minimized
  if (showCallScreen) {
    return (
      <VoiceCallScreen
        roomName={room.name}
        participants={participants}
        currentUserId={currentUserId}
        callDuration={callDuration}
        isMuted={isMuted}
        isScreenSharing={isScreenSharing}
        remoteScreenShares={remoteScreenShares}
        onToggleMute={toggleMute}
        onToggleScreenShare={handleToggleScreenShare}
        onLeave={handleLeaveCall}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      <ChatHeader 
        room={room} 
        currentUserId={currentUserId}
        currentUserRole={currentUserRole || (isOwner ? 'owner' : 'member')}
        isOwner={isOwner}
        onDeleteRoom={onDeleteRoom}
        onLeaveRoom={onLeaveRoom}
        onUpdateRoom={onUpdateRoom}
        onRegenerateCode={onRegenerateCode}
        onRemoveMember={onRemoveMember}
        onUpdateMemberRole={onUpdateMemberRole}
      />

      {/* Active call banner - show when there's an active call */}
      {hasActiveCall && !isInCall && (
        <ActiveCallBanner
          participants={participants}
          starterName={callStarterName}
          onJoin={handleJoinCall}
          isJoining={isJoiningCall}
        />
      )}
      
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
                <Hash className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Bem-vindo ao #{room.name}
              </h3>
              <p className="text-muted-foreground text-sm">
                {room.description || 'Este é o início do canal. Diga olá!'}
              </p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages as any}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
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
                // Check if user is admin/owner or message owner
                const canDeleteAsAdmin = isAdmin && msg.senderId !== currentUserId;
                onDeleteMessage(msg.id, canDeleteAsAdmin);
              }
            } : undefined}
            onReact={onReact}
            isAdmin={isAdmin}
          />
        )}
      </div>
      
      <MessageInput
        onSend={handleSend}
        onTyping={onTyping}
        replyTo={replyingTo as any}
        onCancelReply={onCancelReply}
        placeholder={`Mensagem #${room.name}...`}
        roomMembers={room.members.map(m => ({
          id: m.id,
          username: m.username,
          avatar_url: m.avatar || null,
          status: m.status,
        }))}
      />
    </div>
  );
}
