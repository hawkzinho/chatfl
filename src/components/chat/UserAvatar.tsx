import { cn } from "@/lib/utils";
import { UserStatus } from "@/types/chat";

interface UserAvatarProps {
  src?: string;
  username: string;
  status?: UserStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const statusSizeClasses = {
  xs: 'w-2 h-2 -bottom-0 -right-0',
  sm: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
  md: 'w-3 h-3 -bottom-0.5 -right-0.5',
  lg: 'w-3.5 h-3.5 bottom-0 right-0',
  xl: 'w-4 h-4 bottom-0.5 right-0.5',
};

const statusColors: Record<UserStatus, string> = {
  online: 'bg-status-online',
  offline: 'bg-status-offline',
  away: 'bg-status-away',
  busy: 'bg-status-busy',
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getAvatarColor = (name: string): string => {
  const colors = [
    'from-primary to-cyan-400',
    'from-violet-500 to-purple-400',
    'from-rose-500 to-pink-400',
    'from-amber-500 to-yellow-400',
    'from-emerald-500 to-green-400',
    'from-blue-500 to-indigo-400',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export function UserAvatar({
  src,
  username,
  status,
  size = 'md',
  showStatus = true,
  className,
}: UserAvatarProps) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={username}
          className={cn(
            'rounded-full object-cover ring-2 ring-border/50',
            sizeClasses[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold bg-gradient-to-br ring-2 ring-border/50',
            sizeClasses[size],
            getAvatarColor(username)
          )}
        >
          <span className="text-foreground">{getInitials(username)}</span>
        </div>
      )}
      {showStatus && status && (
        <span
          className={cn(
            'absolute rounded-full ring-2 ring-background',
            statusSizeClasses[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}
