import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import { Hash } from "lucide-react";

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
  members: User[];
  lastMessage?: {
    content: string;
    sender: User;
    createdAt: Date;
  };
  unreadCount?: number;
}

interface RoomListItemProps {
  room: ChatRoom;
  isActive?: boolean;
  onClick?: () => void;
}

export function RoomListItem({ room, isActive, onClick }: RoomListItemProps) {
  const isDirectMessage = room.type === 'direct';
  const otherUser = isDirectMessage ? room.members?.[0] : null;
  const hasAvatar = !!room.avatar;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
        'hover:bg-muted group',
        isActive && 'bg-muted ring-1 ring-primary/30'
      )}
    >
      {isDirectMessage && otherUser ? (
        <UserAvatar
          src={otherUser.avatar}
          username={otherUser.username}
          status={otherUser.status}
          size="sm"
        />
      ) : hasAvatar ? (
        <div className="w-8 h-8 rounded-lg overflow-hidden">
          <img 
            src={room.avatar} 
            alt={room.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
          isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-muted"
        )}>
          <Hash className="w-4 h-4" />
        </div>
      )}

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className={cn(
            "font-medium text-sm truncate",
            isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
          )}>
            {room.name}
          </span>
          {room.unreadCount && room.unreadCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
              {room.unreadCount}
            </span>
          )}
        </div>
        {room.lastMessage && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            <span className="font-medium">{room.lastMessage.sender?.username}:</span>{' '}
            {room.lastMessage.content}
          </p>
        )}
      </div>
    </button>
  );
}