import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
}

interface VoiceCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName: string;
  members: User[];
  currentUserId?: string;
  isIncoming?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onEndCall?: () => void;
}

// Smooth, modern ringtone as base64 (gentle chime pattern)
const RINGTONE = 'data:audio/wav;base64,UklGRrQFAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YZAFAABAAFgAcACIAKAAsAC4ALgAsACgAIgAcABYAEAAKAAQAAAAAAAAAAAAAAAAABAAKABAAFgAcACIAKAAsAC4ALgAsACgAIgAcABYAEAAKAAQAAAAAAAAAAAA+P/g/8j/sP+Y/4D/cP9g/1j/UP9Q/1j/YP9w/4D/mP+w/8j/4P/4/xAAKABAAFgAcACIAKAAsAC4ALgAsACgAIgAcABYAEAAKAAQAAAAAAAAAAAA+P/g/8j/sP+Y/4D/cP9g/1j/UP9Q/1j/YP9w/4D/mP+w/8j/4P/4/xAAKABAAFgAcACIAKAAsAC4ALgAsACgAIgAcABYAEAAKAAQAAAAAAAAAAAAAAAAABAAKABAAFgAcACIAKAAsAC4ALgAsACgAIgAcABYAEAAKAAQAAAAAAAAAAAA+P/g/8j/sP+Y/4D/cP9g/1j/UP9Q/1j/YP9w/4D/mP+w/8j/4P/4/xAAKABAAFgAcACIAKAAsAC4ALgAsACgAIgAcABYAEAAKAAQAAAAAAAAAAAA+P/g/8j/sP+Y/4D/cP9g/1j/UP9Q/1j/YP9w/4D/mP+w/8j/4P/4/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAoAEAAWABwAIgAoACwALgAuACwAKAAiABwAFgAQAAoABAAAAAAAAAAAAD4/+D/yP+w/5j/gP9w/2D/WP9Q/1D/WP9g/3D/gP+Y/7D/yP/g//j/EAAoAEAAWABwAIgAoACwALgAuACwAKAAiABwAFgAQAAoABAAAAAAAAAAAAAAAAAQACgAQABYAHAAiACgALAAuAC4ALAAoACIAHAAWABAACAAAAAAAAAAAAAAAAAA+P/g/8j/sP+Y/4D/cP9g/1j/UP9Q/1j/YP9w/4D/mP+w/8j/4P/4/xAAKABAAFgAcACIAKAAsAC4ALgAsACgAIgAcABYAEAAKAAQAAAAAAAAAAAA+P/g/8j/sP+Y/4D/cP9g/1j/UP9Q/1j/YP9w/4D/mP+w/8j/4P/4/xAAKABAAFgAcACIAKAAsAC4ALgAsACgAIgAcABYAEAAKAAQAAAAAAAAAAAAAAAAABAAKABAAFgAcACIAKAAsAC4ALgAsACgAIgAcABYAEAAKAAQAAAAAAAAAAAA+P/g/8j/sP+Y/4D/cP9g/1j/UP9Q/1j/YP9w/4D/mP+w/8j/4P/4/xAAKABAAFgAcACIAKAAsAC4ALgAsACgAIgAcABYAEAAKAAQAAAAAAAAAAAA+P/g/8j/sP+Y/4D/cP9g/1j/UP9Q/1j/YP9w/4D/mP+w/8j/4P/4/w==';

export function VoiceCallDialog({
  open,
  onOpenChange,
  roomName,
  members,
  currentUserId,
  isIncoming = false,
  onAccept,
  onDecline,
  onEndCall,
}: VoiceCallDialogProps) {
  const [callActive, setCallActive] = useState(!isIncoming);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Play ringtone for incoming calls
  useEffect(() => {
    if (open && isIncoming && !callActive) {
      ringtoneRef.current = new Audio(RINGTONE);
      ringtoneRef.current.loop = true;
      ringtoneRef.current.volume = 0.6;
      ringtoneRef.current.play().catch(() => {});
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, [open, isIncoming, callActive]);

  // Call duration timer
  useEffect(() => {
    if (callActive && open) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callActive, open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setCallDuration(0);
      setCallActive(!isIncoming);
      setMuted(false);
      setDeafened(false);
    }
  }, [open, isIncoming]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
    }
    setCallActive(true);
    onAccept?.();
  };

  const handleDecline = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
    }
    onDecline?.();
    onOpenChange(false);
  };

  const handleEndCall = () => {
    onEndCall?.();
    onOpenChange(false);
  };

  const otherMembers = members.filter(m => m.id !== currentUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isIncoming && !callActive ? 'Chamada Recebida' : 'Chamada de Voz'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 gap-4">
          <div className="text-lg font-medium text-foreground">
            #{roomName}
          </div>

          <div className="flex flex-wrap justify-center gap-3 max-w-xs">
            {otherMembers.slice(0, 6).map((member) => (
              <div key={member.id} className="flex flex-col items-center gap-1">
                <UserAvatar
                  src={member.avatar}
                  username={member.username}
                  status={member.status}
                  size="md"
                />
                <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                  {member.username}
                </span>
              </div>
            ))}
            {otherMembers.length > 6 && (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground text-sm">
                +{otherMembers.length - 6}
              </div>
            )}
          </div>

          {callActive && (
            <div className="text-2xl font-mono text-foreground">
              {formatDuration(callDuration)}
            </div>
          )}

          {isIncoming && !callActive ? (
            <div className="flex gap-4 mt-4">
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={handleDecline}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              <Button
                size="lg"
                className="rounded-full w-14 h-14 bg-green-600 hover:bg-green-700"
                onClick={handleAccept}
              >
                <Phone className="w-6 h-6" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 mt-4">
              <Button
                variant={muted ? "destructive" : "outline"}
                size="lg"
                className="rounded-full w-12 h-12"
                onClick={() => setMuted(!muted)}
              >
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                variant={deafened ? "destructive" : "outline"}
                size="lg"
                className="rounded-full w-12 h-12"
                onClick={() => setDeafened(!deafened)}
              >
                {deafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-12 h-12"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
