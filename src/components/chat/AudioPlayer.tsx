import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      setError(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleCanPlay = () => {
      setIsLoaded(true);
      setError(false);
    };
    const handleError = () => {
      setError(true);
      setIsLoaded(false);
    };
    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('durationchange', handleDurationChange);

    // Try to load the audio
    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('durationchange', handleDurationChange);
    };
  }, [src]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Erro ao reproduzir áudio:', err);
      setError(true);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audioRef.current.currentTime = percentage * duration;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 max-w-xs',
        className
      )}>
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">Áudio não disponível</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 max-w-xs',
      className
    )}>
      <audio ref={audioRef} src={src} preload="auto" />
      
      <button
        onClick={togglePlay}
        disabled={!isLoaded}
        className={cn(
          "w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity",
          !isLoaded && "opacity-50 cursor-not-allowed"
        )}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div 
          className="h-1.5 bg-muted rounded-full cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-muted-foreground font-mono">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );
}