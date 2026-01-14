import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import { supabase } from "@/integrations/supabase/client";

interface DirectMessage {
  id: string;
  friendId: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastMessage?: {
    content: string;
    createdAt: Date;
  };
}

interface DMListItemProps {
  dm: DirectMessage;
  isActive?: boolean;
  onClick?: () => void;
}

export function DMListItem({ dm, isActive, onClick }: DMListItemProps) {
  // Real-time status tracking
  const [status, setStatus] = useState<'online' | 'offline' | 'away' | 'busy'>(dm.status);

  // Subscribe to real-time status updates for this user
  useEffect(() => {
    setStatus(dm.status);

    const channel = supabase
      .channel(`dm-sidebar-status-${dm.friendId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${dm.friendId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status as 'online' | 'offline' | 'away' | 'busy';
          setStatus(newStatus || 'offline');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dm.friendId, dm.status]);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
        'hover:bg-muted',
        isActive && 'bg-muted ring-1 ring-primary/30'
      )}
    >
      <UserAvatar
        src={dm.avatar}
        username={dm.username}
        status={status}
        size="sm"
      />
      <div className="flex-1 min-w-0 text-left">
        <span className="text-sm font-medium truncate block">{dm.username}</span>
        {dm.lastMessage && (
          <span className="text-xs text-muted-foreground truncate block">
            {dm.lastMessage.content}
          </span>
        )}
      </div>
      <span className={cn(
        "w-2 h-2 rounded-full shrink-0",
        status === 'online' ? 'bg-green-500' : 
        status === 'away' ? 'bg-yellow-500' :
        status === 'busy' ? 'bg-red-500' : 'bg-muted-foreground/30'
      )} />
    </button>
  );
}