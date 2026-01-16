import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Phone, Mic, MicOff, PhoneOff, Maximize2, GripVertical, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });

  // Initialize position to top-right corner on mount (safe zone away from input)
  useEffect(() => {
    if (barRef.current && !hasInitialized) {
      const rect = barRef.current.getBoundingClientRect();
      // Position at top-right corner with padding
      const initialX = window.innerWidth - rect.width - 20;
      const initialY = 80; // Below typical header
      setPosition({ x: initialX, y: initialY });
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // Handle window resize - keep in viewport
  useEffect(() => {
    const handleResize = () => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 10;
      const maxY = window.innerHeight - rect.height - 10;
      
      setPosition(prev => ({
        x: Math.max(10, Math.min(prev.x, maxX)),
        y: Math.max(10, Math.min(prev.y, maxY)),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
  }, [position]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    positionStartRef.current = { ...position };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      const newX = positionStartRef.current.x + deltaX;
      const newY = positionStartRef.current.y + deltaY;

      // Constrain to viewport with padding
      const rect = barRef.current?.getBoundingClientRect();
      const maxX = window.innerWidth - (rect?.width || 300) - 10;
      const maxY = window.innerHeight - (rect?.height || 60) - 10;
      
      setPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(10, Math.min(newY, maxY)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;
      
      const newX = positionStartRef.current.x + deltaX;
      const newY = positionStartRef.current.y + deltaY;

      const rect = barRef.current?.getBoundingClientRect();
      const maxX = window.innerWidth - (rect?.width || 300) - 10;
      const maxY = window.innerHeight - (rect?.height || 60) - 10;
      
      setPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(10, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleTouchEnd = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={barRef}
      className={cn(
        "fixed z-[100] flex items-center gap-3 px-4 py-2 bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-xl select-none transition-shadow",
        isDragging ? "cursor-grabbing opacity-95 shadow-2xl" : "hover:shadow-lg"
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Drag handle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="flex items-center gap-1 cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 rounded hover:bg-muted transition-colors"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent>Arraste para mover</TooltipContent>
      </Tooltip>

      {/* Connection indicator */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <Phone className="w-4 h-4 text-green-500" />
      </div>
      
      {/* Room info */}
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
          #{roomName}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {formatDuration(callDuration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 ml-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isMuted ? "destructive" : "ghost"}
              size="sm"
              className="rounded-full w-8 h-8 p-0"
              onClick={onToggleMute}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isMuted ? "Ativar microfone" : "Desativar microfone"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full w-8 h-8 p-0"
              onClick={onExpand}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Expandir chamada</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-full w-8 h-8 p-0"
              onClick={onLeaveCall}
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sair da chamada</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
