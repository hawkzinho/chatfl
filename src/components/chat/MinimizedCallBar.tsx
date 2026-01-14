import { cn } from "@/lib/utils";
import { Phone, Mic, MicOff, PhoneOff, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MinimizedCallBarProps {
  roomName: string;
  isMuted: boolean;
  callDuration: number;
  onToggleMute: () => void;
  onLeaveCall: () => void;
  onExpand: () => void;
}

export function MinimizedCallBar({
  roomName,
  isMuted,
  callDuration,
  onToggleMute,
  onLeaveCall,
  onExpand,
}: MinimizedCallBarProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-full shadow-lg">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <Phone className="w-4 h-4 text-green-500" />
      </div>
      
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
          #{roomName}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {formatDuration(callDuration)}
        </span>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <Button
          variant={isMuted ? "destructive" : "ghost"}
          size="sm"
          className="rounded-full w-8 h-8 p-0"
          onClick={onToggleMute}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="rounded-full w-8 h-8 p-0"
          onClick={onExpand}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>

        <Button
          variant="destructive"
          size="sm"
          className="rounded-full w-8 h-8 p-0"
          onClick={onLeaveCall}
        >
          <PhoneOff className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}