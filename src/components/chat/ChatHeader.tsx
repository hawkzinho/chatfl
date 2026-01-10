import { useState } from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import { RoomEditorDialog } from "./RoomEditorDialog";
import { 
  Hash,
  Users,
  Copy,
  MoreVertical,
  Settings,
  LogOut,
  Trash2,
  Link,
  Share2
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
  const isDirectMessage = room.type === 'direct';
  const otherUser = isDirectMessage ? room.members.find(m => m.id !== currentUserId) || room.members[0] : null;
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
      toast.success('Invite link copied!');
    }
  };

  const copyInviteCode = () => {
    if (room.inviteCode) {
      navigator.clipboard.writeText(room.inviteCode);
      toast.success('Invite code copied!');
    }
  };

  const handleLeave = async () => {
    if (confirm('Are you sure you want to leave this channel?')) {
      await onLeaveRoom?.(room.id);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this channel? This cannot be undone.')) {
      await onDeleteRoom?.(room.id);
    }
  };

  return (
    <>
      <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-3 min-w-0">
          {isDirectMessage && otherUser ? (
            <UserAvatar
              src={otherUser.avatar}
              username={otherUser.username}
              status={otherUser.status}
              size="sm"
            />
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
                  <TooltipContent>Copy invite code</TooltipContent>
                </Tooltip>
              )}
            </div>
            {isDirectMessage && otherUser ? (
              <p className={cn(
                "text-xs capitalize",
                otherUser.status === 'online' ? 'text-green-600' : 'text-muted-foreground'
              )}>
                {otherUser.status}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {room.description || `${room.members.length} members • ${onlineMembers} online`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isDirectMessage && room.inviteCode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={copyInviteLink}
                  className="p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Copy invite link</TooltipContent>
            </Tooltip>
          )}
          {!isDirectMessage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-2 rounded-md hover:bg-muted transition-colors">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{room.members.length} members</TooltipContent>
            </Tooltip>
          )}

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
                    Copy Invite Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyInviteCode}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Invite Code
                  </DropdownMenuItem>
                </>
              )}
              
              {!isDirectMessage && (
                <>
                  <DropdownMenuItem onClick={() => setEditorOpen(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Channel Settings
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {isOwner ? (
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Channel
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem 
                      onClick={handleLeave}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Leave Channel
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!isDirectMessage && onUpdateRoom && onDeleteRoom && (
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
    </>
  );
}
