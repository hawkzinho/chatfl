import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Phone, Users } from "lucide-react";
import { UserAvatar } from "./UserAvatar";

const RINGTONE_PATH = '/sounds/ringtone.mp3';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedRef = useRef(false);

  // Play ringtone when banner appears (incoming call detected)
  useEffect(() => {
    if (participants.length === 0) return;
    
    // Only play once per call
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    const audio = new Audio(RINGTONE_PATH);
    audio.loop = false;
    audio.volume = 0.6;
    audioRef.current = audio;

    // Try to play ringtone
    const playRingtone = () => {
      audio.play().catch((err) => {
        console.log('Ringtone autoplay blocked:', err.message);
        // Wait for user interaction
        const handleInteraction = () => {
          audio.play().catch(() => {});
          document.removeEventListener('click', handleInteraction);
          document.removeEventListener('keydown', handleInteraction);
        };
        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });
      });
    };

    playRingtone();

    // Stop ringtone after 9 seconds
    timeoutRef.current = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }, 9000);

    return () => {
      // Cleanup on unmount (user joined or left the room)
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [participants.length]);

  // Stop ringtone when joining
  const handleJoin = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onJoin();
  };

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
        onClick={handleJoin}
        disabled={isJoining}
      >
        <Phone className="w-4 h-4 mr-1" />
        Entrar
      </Button>
    </div>
  );
}
