import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import { 
  Phone, 
  Video, 
  Search, 
  MoreVertical,
  Pin,
  Bell,
  Users,
  Settings,
  Hash,
  Lock,
  Copy
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
  members: User[];
  createdAt: Date;
}

interface ChatHeaderProps {
  room: ChatRoom;
  currentUserId: string;
  onSearch?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onViewMembers?: () => void;
}

export function ChatHeader({
  room,
  currentUserId,
  onSearch,
  onCall,
  onVideoCall,
  onViewMembers,
}: ChatHeaderProps) {
  const isDirectMessage = room.type === 'direct';
  const otherUser = isDirectMessage
    ? room.members.find((m) => m.id !== currentUserId)
    : null;

  const onlineMembers = room.members.filter((m) => m.status === 'online').length;

  const copyInviteCode = () => {
    if (room.inviteCode) {
      navigator.clipboard.writeText(room.inviteCode);
      toast.success('Invite code copied! Share it with friends to join.');
    }
  };

  return (
    <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {isDirectMessage && otherUser ? (
          <>
            <UserAvatar
              src={otherUser.avatar}
              username={otherUser.username}
              status={otherUser.status}
              size="md"
            />
            <div>
              <h2 className="font-semibold text-foreground">{otherUser.username}</h2>
              <p className="text-xs text-muted-foreground capitalize">
                {otherUser.status === 'online' ? 'Online' : `Last seen recently`}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              {room.type === 'private' ? (
                <Lock className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Hash className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{room.name}</h2>
              <p className="text-xs text-muted-foreground">
                {onlineMembers} of {room.members.length} online
              </p>
            </div>
            {room.inviteCode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={copyInviteCode}
                    className="ml-2 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                  >
                    <span className="text-xs font-mono font-semibold text-primary">{room.inviteCode}</span>
                    <Copy className="w-3 h-3 text-primary" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Click to copy invite code</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isDirectMessage && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onCall}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Phone className="w-5 h-5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Voice call</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onVideoCall}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Video className="w-5 h-5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Video call</TooltipContent>
            </Tooltip>
          </>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onSearch}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Search in chat</TooltipContent>
        </Tooltip>

        {!isDirectMessage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onViewMembers}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Users className="w-5 h-5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>View members</TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>More options</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pin className="w-4 h-4 mr-2" />
              Pin conversation
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bell className="w-4 h-4 mr-2" />
              Mute notifications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Chat settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
