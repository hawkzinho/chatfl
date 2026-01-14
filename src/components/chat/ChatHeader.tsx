import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import { RoomEditorDialog } from "./RoomEditorDialog";
import { VoiceCallPanel } from "./VoiceCallPanel";
import { supabase } from "@/integrations/supabase/client";
import {
  Hash,
  Users,
  Copy,
  MoreVertical,
  Settings,
  LogOut,
  Trash2,
  Link,
  Share2,
  Phone,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
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

interface ChatHeaderProps {
  room: ChatRoom;
  currentUserId?: string;
  isOwner?: boolean;
  onDeleteRoom?: (roomId: string) => Promise<void>;
  onLeaveRoom?: (roomId: string) => Promise<void>;
  onUpdateRoom?: (roomId: string, name: string, description: string, avatarUrl?: string) => Promise<void>;
  onRegenerateCode?: (roomId: string) => Promise<void>;
}

export function ChatHeader({ 
  room, 
  currentUserId,
  isOwner = false,
  onDeleteRoom,
  onLeaveRoom,
  onUpdateRoom,
  onRegenerateCode,
}: ChatHeaderProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [voiceCallOpen, setVoiceCallOpen] = useState(false);
  
  const isDM = room.type === 'direct';
  
  // For DMs, find the other user
  const otherUser = isDM 
    ? room.members.find(m => m.id !== currentUserId)
    : null;

  // Real-time status tracking for DMs
  const [otherUserStatus, setOtherUserStatus] = useState<'online' | 'offline' | 'away' | 'busy'>(
    otherUser?.status || 'offline'
  );

  // Subscribe to real-time status updates for the other user in DMs
  useEffect(() => {
    if (!isDM || !otherUser?.id) return;

    // Set initial status
    setOtherUserStatus(otherUser.status || 'offline');

    const channel = supabase
      .channel(`dm-status-${otherUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${otherUser.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status as 'online' | 'offline' | 'away' | 'busy';
          setOtherUserStatus(newStatus || 'offline');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDM, otherUser?.id, otherUser?.status]);

  const onlineMembers = room.members.filter(m => m.status === 'online').length;

  const getInviteLink = () => {
    if (room.inviteCode) {
      return `${window.location.origin}/invite/${room.inviteCode}`;
    }
    return null;
  };

  const copyInviteLink = () => {
    const link = getInviteLink();
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success('Link de convite copiado!');
    }
  };

  const copyInviteCode = () => {
    if (room.inviteCode) {
      navigator.clipboard.writeText(room.inviteCode);
      toast.success('Código de convite copiado!');
    }
  };

  const handleLeave = async () => {
    const message = isDM 
      ? 'Tem certeza que deseja sair desta conversa?' 
      : 'Tem certeza que deseja sair deste canal?';
    if (confirm(message)) {
      await onLeaveRoom?.(room.id);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este canal? Isso não pode ser desfeito.')) {
      await onDeleteRoom?.(room.id);
    }
  };

  // For DMs, render a minimal header with ONLY the other user's info
  if (isDM) {
    // If we can't resolve the other user, don't render the header
    if (!otherUser) {
      return (
        <div className="h-14 px-4 flex items-center border-b border-border bg-card">
          <p className="text-muted-foreground">Conversa inválida</p>
        </div>
      );
    }

    return (
      <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            src={otherUser.avatar}
            username={otherUser.username}
            status={otherUserStatus}
            size="sm"
          />
          <div className="min-w-0">
            <h2 className="font-medium text-foreground truncate">
              {otherUser.username}
            </h2>
            <p className="text-xs text-muted-foreground">
              {otherUserStatus === 'online' ? 'Online' : 
               otherUserStatus === 'away' ? 'Ausente' :
               otherUserStatus === 'busy' ? 'Ocupado' : 'Offline'}
            </p>
          </div>
        </div>

        {/* Minimal actions for DM - just close conversation */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-md hover:bg-muted transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              onClick={handleLeave}
              className="text-destructive focus:text-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              Fechar Conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Regular channel header
  return (
    <>
      <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-3 min-w-0">
          {room.avatar ? (
            <div className="w-8 h-8 rounded-md overflow-hidden">
              <img 
                src={room.avatar} 
                alt={room.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
              <Hash className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-foreground truncate">
                {room.name}
              </h2>
              {room.inviteCode && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={copyInviteCode}
                      className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      {room.inviteCode}
                      <Copy className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Copiar código de convite</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {room.description || `${room.members.length} membros • ${onlineMembers} online`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setVoiceCallOpen(true)}
                className="p-2 rounded-md hover:bg-muted transition-colors"
              >
                <Phone className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Chamada de voz</TooltipContent>
          </Tooltip>

          {room.inviteCode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={copyInviteLink}
                  className="p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Copiar link de convite</TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-2 rounded-md hover:bg-muted transition-colors">
                <Users className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{room.members.length} membros</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md hover:bg-muted transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {room.inviteCode && (
                <>
                  <DropdownMenuItem onClick={copyInviteLink}>
                    <Link className="w-4 h-4 mr-2" />
                    Copiar Link de Convite
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyInviteCode}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Código
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuItem onClick={() => setEditorOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações do Canal
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {isOwner ? (
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Canal
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={handleLeave}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair do Canal
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {onUpdateRoom && onDeleteRoom && (
        <RoomEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          room={{
            id: room.id,
            name: room.name,
            description: room.description,
            inviteCode: room.inviteCode,
            avatar: room.avatar,
          }}
          onUpdate={onUpdateRoom}
          onDelete={onDeleteRoom}
          onRegenerateCode={onRegenerateCode}
          isOwner={isOwner}
        />
      )}

      {/* Voice Call Sheet */}
      <Sheet open={voiceCallOpen} onOpenChange={setVoiceCallOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Chamada de Voz</SheetTitle>
          </SheetHeader>
          <VoiceCallPanel
            roomId={room.id}
            roomName={room.name}
            members={room.members}
            currentUserId={currentUserId}
            onClose={() => setVoiceCallOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
