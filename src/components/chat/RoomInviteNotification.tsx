import { cn } from '@/lib/utils';
import { UserAvatar } from './UserAvatar';
import { Check, X, Users } from 'lucide-react';

interface RoomInvite {
  id: string;
  room_id: string;
  sender: {
    id: string;
    username: string;
    avatar_url: string | null;
    status: string;
  };
  room: {
    id: string;
    name: string;
    description: string | null;
    type: string;
  };
}

interface RoomInviteNotificationProps {
  invites: RoomInvite[];
  onAccept: (inviteId: string) => Promise<string | null>;
  onReject: (inviteId: string) => Promise<void>;
  onRoomJoined?: (roomId: string) => void;
}

export function RoomInviteNotification({
  invites,
  onAccept,
  onReject,
  onRoomJoined,
}: RoomInviteNotificationProps) {
  if (invites.length === 0) return null;

  const handleAccept = async (inviteId: string) => {
    const roomId = await onAccept(inviteId);
    if (roomId && onRoomJoined) {
      onRoomJoined(roomId);
    }
  };

  return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
      <p className="text-xs font-medium text-primary flex items-center gap-2">
        <Users className="w-3.5 h-3.5" />
        Convites para Canais
      </p>
      
      <div className="space-y-2">
        {invites.map((invite) => (
          <div 
            key={invite.id} 
            className="p-3 rounded-lg bg-background border border-border"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {invite.room.name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <UserAvatar
                    src={invite.sender.avatar_url || undefined}
                    username={invite.sender.username}
                    status={invite.sender.status as 'online' | 'offline' | 'away' | 'busy'}
                    size="xs"
                  />
                  <span>de <span className="text-foreground">{invite.sender.username}</span></span>
                </p>
              </div>

              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleAccept(invite.id)}
                  className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  title="Entrar no canal"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onReject(invite.id)}
                  className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                  title="Recusar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}