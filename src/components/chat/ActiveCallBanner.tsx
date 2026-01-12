import { Button } from "@/components/ui/button";
import { Phone, Users } from "lucide-react";
import { UserAvatar } from "./UserAvatar";

interface Participant {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
}

interface ActiveCallBannerProps {
  participants: Participant[];
  starterName?: string;
  onJoin: () => void;
  isJoining?: boolean;
}

export function ActiveCallBanner({
  participants,
  starterName,
  onJoin,
  isJoining,
}: ActiveCallBannerProps) {
  if (participants.length === 0) return null;

  return (
    <div className="mx-4 my-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <Phone className="w-5 h-5 text-green-500 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {starterName || 'Alguém'} está em uma chamada de voz
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{participants.length} participante{participants.length !== 1 ? 's' : ''}</span>
            <span className="mx-1">•</span>
            <div className="flex -space-x-1">
              {participants.slice(0, 3).map((p) => (
                <UserAvatar
                  key={p.id}
                  src={p.avatar_url}
                  username={p.username}
                  status="online"
                  size="xs"
                />
              ))}
              {participants.length > 3 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{participants.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={onJoin}
        disabled={isJoining}
      >
        <Phone className="w-4 h-4 mr-1" />
        Entrar
      </Button>
    </div>
  );
}
