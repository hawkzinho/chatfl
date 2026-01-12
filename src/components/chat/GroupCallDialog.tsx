import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
}

interface GroupCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomName: string;
  members: User[];
  currentUserId?: string;
  isIncoming?: boolean;
  callerId?: string;
  callerName?: string;
}

// Modern, pleasant ringtone (WhatsApp-style gentle chime)
const CALL_RINGTONE = 'data:audio/wav;base64,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';

// End call tone
const END_CALL_TONE = 'data:audio/wav;base64,UklGRjQBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YRABAAAAAAD//wEA//8BAP//AQD//wEA//8BAP//AQD//wEA//8BAAEA//8BAAEA//8AAAEAAAD//wEAAQD//wAAAQAAAP//AQD//wEA//8BAP7/AgD+/wIA/v8CAP3/AwD9/wMA/P8EAPz/BAD7/wUA+/8FAPr/BgD6/wYA+f8HAPn/BwD4/wgA+P8IAPf/CQD3/wkA9v8KAPb/CgD1/wsA9f8LAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAA==';

export function GroupCallDialog({
  open,
  onOpenChange,
  roomId,
  roomName,
  members,
  currentUserId,
  isIncoming = false,
  callerId,
  callerName,
}: GroupCallDialogProps) {
  const [callActive, setCallActive] = useState(!isIncoming);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [activeParticipants, setActiveParticipants] = useState<User[]>([]);
  
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const endToneRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Play ringtone for incoming calls
  useEffect(() => {
    if (open && isIncoming && !callActive) {
      ringtoneRef.current = new Audio(CALL_RINGTONE);
      ringtoneRef.current.loop = true;
      ringtoneRef.current.volume = 0.5;
      ringtoneRef.current.play().catch(() => {
        console.log('Ringtone autoplay blocked');
      });
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

  // Setup media when call is active
  useEffect(() => {
    const setupMedia = async () => {
      if (callActive && open) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: videoEnabled,
          });
          localStreamRef.current = stream;
          
          if (localVideoRef.current && videoEnabled) {
            localVideoRef.current.srcObject = stream;
          }
          
          // Add current user as participant
          const currentMember = members.find(m => m.id === currentUserId);
          if (currentMember) {
            setActiveParticipants([currentMember]);
          }
        } catch (error) {
          console.log('Media access error:', error);
          toast.error('Não foi possível acessar microfone/câmera');
        }
      }
    };

    setupMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [callActive, open, videoEnabled, currentUserId, members]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setCallDuration(0);
      setCallActive(!isIncoming);
      setMuted(false);
      setVideoEnabled(false);
      setDeafened(false);
      setActiveParticipants([]);
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    }
  }, [open, isIncoming]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
    }
    setCallActive(true);
    toast.success('Você entrou na chamada');
  };

  const handleDecline = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
    }
    onOpenChange(false);
    toast.info('Chamada recusada');
  };

  const handleEndCall = () => {
    // Play end call tone
    endToneRef.current = new Audio(END_CALL_TONE);
    endToneRef.current.volume = 0.3;
    endToneRef.current.play().catch(() => {});
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    onOpenChange(false);
    toast.info('Chamada encerrada');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = muted;
        setMuted(!muted);
      }
    } else {
      setMuted(!muted);
    }
  };

  const toggleVideo = async () => {
    if (videoEnabled) {
      // Disable video
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStreamRef.current.removeTrack(videoTrack);
        }
      }
      setVideoEnabled(false);
    } else {
      // Enable video
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (localStreamRef.current) {
          const videoTrack = stream.getVideoTracks()[0];
          localStreamRef.current.addTrack(videoTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        }
        setVideoEnabled(true);
      } catch (error) {
        toast.error('Não foi possível acessar a câmera');
      }
    }
  };

  const otherMembers = members.filter(m => m.id !== currentUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-card">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isIncoming && !callActive ? 'Chamada Recebida' : 'Chamada em Grupo'}
              </h2>
              <p className="text-sm text-muted-foreground">#{roomName}</p>
            </div>
            {callActive && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{activeParticipants.length} participante{activeParticipants.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="p-6">
          {/* Video preview area */}
          {callActive && videoEnabled && (
            <div className="mb-6 aspect-video bg-muted rounded-lg overflow-hidden relative">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
                Você
              </div>
            </div>
          )}

          {/* Participants grid */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {(callActive ? activeParticipants : otherMembers.slice(0, 6)).map((member) => (
              <div key={member.id} className="flex flex-col items-center gap-2">
                <div className={cn(
                  "relative",
                  callActive && "ring-2 ring-green-500 ring-offset-2 ring-offset-background rounded-full"
                )}>
                  <UserAvatar
                    src={member.avatar}
                    username={member.username}
                    status={member.status}
                    size="lg"
                  />
                </div>
                <span className="text-sm font-medium text-foreground truncate max-w-[80px]">
                  {member.id === currentUserId ? 'Você' : member.username}
                </span>
              </div>
            ))}
            {!callActive && otherMembers.length > 6 && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">
                  +{otherMembers.length - 6}
                </div>
                <span className="text-sm text-muted-foreground">outros</span>
              </div>
            )}
          </div>

          {/* Call timer */}
          {callActive && (
            <div className="text-center mb-6">
              <div className="text-3xl font-mono font-bold text-foreground">
                {formatDuration(callDuration)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {videoEnabled ? 'Chamada de vídeo' : 'Chamada de voz'}
              </p>
            </div>
          )}

          {/* Incoming call info */}
          {isIncoming && !callActive && callerName && (
            <div className="text-center mb-6">
              <p className="text-lg text-foreground animate-pulse">
                {callerName} está chamando...
              </p>
            </div>
          )}

          {/* Controls */}
          {isIncoming && !callActive ? (
            <div className="flex justify-center gap-6">
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16"
                onClick={handleDecline}
              >
                <PhoneOff className="w-7 h-7" />
              </Button>
              <Button
                size="lg"
                className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
                onClick={handleAccept}
              >
                <Phone className="w-7 h-7" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center gap-3">
              <Button
                variant={muted ? "destructive" : "outline"}
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={toggleMute}
                title={muted ? "Ativar microfone" : "Desativar microfone"}
              >
                {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              <Button
                variant={videoEnabled ? "default" : "outline"}
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={toggleVideo}
                title={videoEnabled ? "Desativar vídeo" : "Ativar vídeo"}
              >
                {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>
              <Button
                variant={deafened ? "destructive" : "outline"}
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={() => setDeafened(!deafened)}
                title={deafened ? "Ativar áudio" : "Desativar áudio"}
              >
                {deafened ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={handleEndCall}
                title="Encerrar chamada"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}