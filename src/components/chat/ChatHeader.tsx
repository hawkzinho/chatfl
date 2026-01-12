import { useState } from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import { RoomEditorDialog } from "./RoomEditorDialog";
import { VoiceCallDialog } from "./VoiceCallDialog";
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
  Phone
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
  onUpdateRoom?: (roomId: string, name: string, description: string) => Promise<void>;
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
  const [callDialogOpen, setCallDialogOpen] = useState(false);
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
    if (confirm('Tem certeza que deseja sair deste canal?')) {
      await onLeaveRoom?.(room.id);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este canal? Isso não pode ser desfeito.')) {
      await onDeleteRoom?.(room.id);
    }
  };

  const handleStartCall = () => {
    setCallDialogOpen(true);
    toast.info('Chamada de voz iniciada!');
  };

  return (
    <>
      <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
            <Hash className="w-4 h-4 text-muted-foreground" />
          </div>
          
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
                onClick={handleStartCall}
                className="p-2 rounded-md hover:bg-muted transition-colors"
              >
                <Phone className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Iniciar chamada de voz</TooltipContent>
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
          }}
          onUpdate={onUpdateRoom}
          onDelete={onDeleteRoom}
          onRegenerateCode={onRegenerateCode}
          isOwner={isOwner}
        />
      )}

      <VoiceCallDialog
        open={callDialogOpen}
        onOpenChange={setCallDialogOpen}
        roomName={room.name}
        members={room.members}
        currentUserId={currentUserId}
        onEndCall={() => toast.info('Chamada encerrada')}
      />
    </>
  );
}