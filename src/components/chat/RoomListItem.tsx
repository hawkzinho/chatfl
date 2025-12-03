import { cn } from "@/lib/utils";
import { ChatRoom } from "@/types/chat";
import { UserAvatar } from "./UserAvatar";
import { Hash, Lock, Users } from "lucide-react";

interface RoomListItemProps {
  room: ChatRoom;
  isActive?: boolean;
  onClick?: () => void;
}

const formatLastMessageTime = (date?: Date): string => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
};

export function RoomListItem({ room, isActive, onClick }: RoomListItemProps) {
  const isDirectMessage = room.type === 'direct';
  const otherUser = isDirectMessage ? room.members.find(m => m.id !== 'current-user') : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
        'hover:bg-sidebar-accent',
        isActive && 'bg-sidebar-accent'
      )}
    >
      {isDirectMessage && otherUser ? (
        <UserAvatar
          src={otherUser.avatar}
          username={otherUser.username}
          status={otherUser.status}
          size="md"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
          {room.type === 'private' ? (
            <Lock className="w-5 h-5 text-sidebar-foreground/70" />
          ) : (
            <Hash className="w-5 h-5 text-sidebar-foreground/70" />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">
            {isDirectMessage && otherUser ? otherUser.username : room.name}
          </span>
          {room.lastMessage && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatLastMessageTime(room.lastMessage.createdAt)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">
            {room.lastMessage?.content || 'No messages yet'}
          </p>
          {room.unreadCount && room.unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
              {room.unreadCount > 99 ? '99+' : room.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
