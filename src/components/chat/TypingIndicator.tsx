import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  users: string[];
  className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  // Format text for multi-user typing display
  const text =
    users.length === 1
      ? `${users[0]} está digitando`
      : users.length === 2
      ? `${users[0]} e ${users[1]} estão digitando`
      : users.length === 3
      ? `${users[0]}, ${users[1]} e ${users[2]} estão digitando`
      : `${users[0]}, ${users[1]} e mais ${users.length - 2} estão digitando`;

  return (
    <div className={cn('flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg mx-4 mb-2', className)}>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground font-medium">{text}</span>
    </div>
  );
}
