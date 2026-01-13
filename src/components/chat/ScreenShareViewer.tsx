import { useEffect, useRef, useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScreenShare {
  peerId: string;
  username: string;
  videoElement: HTMLVideoElement;
}

interface ScreenShareViewerProps {
  screenShares: ScreenShare[];
  onClose?: () => void;
}

export function ScreenShareViewer({ screenShares, onClose }: ScreenShareViewerProps) {
  const containerRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [expandedShare, setExpandedShare] = useState<string | null>(null);
  const [mounted, setMounted] = useState<Set<string>>(new Set());

  useEffect(() => {
    screenShares.forEach((share) => {
      const container = containerRefs.current.get(share.peerId);
      if (container && share.videoElement) {
        // Only append if not already a child
        if (!container.contains(share.videoElement)) {
          // Style the video element
          share.videoElement.style.width = '100%';
          share.videoElement.style.height = '100%';
          share.videoElement.style.objectFit = 'contain';
          share.videoElement.style.borderRadius = '0.5rem';
          share.videoElement.style.backgroundColor = 'black';
          
          container.appendChild(share.videoElement);
          share.videoElement.play().catch(() => {});
          
          setMounted(prev => new Set(prev).add(share.peerId));
        }
      }
    });

    // Cleanup removed shares
    return () => {
      containerRefs.current.forEach((container, peerId) => {
        if (container && !screenShares.find(s => s.peerId === peerId)) {
          container.innerHTML = '';
        }
      });
    };
  }, [screenShares]);

  if (screenShares.length === 0) {
    return null;
  }

  const handleExpand = (peerId: string) => {
    setExpandedShare(expandedShare === peerId ? null : peerId);
  };

  // Render expanded fullscreen view
  if (expandedShare) {
    const share = screenShares.find(s => s.peerId === expandedShare);
    if (!share) return null;

    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-black/80">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-medium">
              Tela de {share.username}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpandedShare(null)}
              className="text-white hover:bg-white/10"
            >
              <Minimize2 className="w-5 h-5" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
        <div
          ref={(el) => containerRefs.current.set(share.peerId, el)}
          className="flex-1 p-4"
        />
      </div>
    );
  }

  // Render grid view
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">
            {screenShares.length} tela{screenShares.length !== 1 ? 's' : ''} compartilhada{screenShares.length !== 1 ? 's' : ''}
          </span>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <div className={cn(
        "grid gap-2 p-2",
        screenShares.length === 1 ? "grid-cols-1" : "grid-cols-2"
      )}>
        {screenShares.map((share) => (
          <div
            key={share.peerId}
            className="relative bg-black rounded-lg overflow-hidden group"
          >
            <div
              ref={(el) => containerRefs.current.set(share.peerId, el)}
              className="aspect-video w-full"
            />
            
            {/* Overlay with username and expand button */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium truncate">
                  {share.username}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => handleExpand(share.peerId)}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
