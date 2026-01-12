import { cn } from "@/lib/utils";

interface SystemMessageProps {
  content: string;
  timestamp: Date;
}

export function SystemMessage({ content, timestamp }: SystemMessageProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="flex justify-center py-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground text-xs">
        <span>{content}</span>
        <span className="text-muted-foreground/60">•</span>
        <span className="text-muted-foreground/60">{formatTime(timestamp)}</span>
      </div>
    </div>
  );
}
