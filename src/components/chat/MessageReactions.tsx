import { cn } from "@/lib/utils";
import { Reaction } from "@/types/chat";

interface MessageReactionsProps {
  reactions: Reaction[];
  currentUserId: string;
  onReact: (emoji: string) => void;
  className?: string;
}

export function MessageReactions({
  reactions,
  currentUserId,
  onReact,
  className,
}: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1 mt-1', className)}>
      {reactions.map((reaction) => {
        const isReacted = reaction.users.includes(currentUserId);
        return (
          <button
            key={reaction.emoji}
            onClick={() => onReact(reaction.emoji)}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all',
              'hover:scale-105 active:scale-95',
              isReacted
                ? 'bg-primary/20 border border-primary/40 text-primary'
                : 'bg-muted border border-border hover:bg-muted/80'
            )}
          >
            <span>{reaction.emoji}</span>
            <span className="font-medium">{reaction.users.length}</span>
          </button>
        );
      })}
    </div>
  );
}
