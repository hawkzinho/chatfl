import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  status?: string;
}

interface MentionDropdownProps {
  users: User[];
  selectedIndex: number;
  onSelect: (user: User) => void;
  position: { top: number; left: number };
  isVisible: boolean;
}

export function MentionDropdown({
  users,
  selectedIndex,
  onSelect,
  position,
  isVisible,
}: MentionDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isVisible || users.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[200px]"
      style={{ bottom: position.top, left: position.left }}
    >
      <div className="p-1">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Membros
        </div>
        {users.map((user, index) => (
          <button
            key={user.id}
            onClick={() => onSelect(user)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            )}
          >
            <UserAvatar
              src={user.avatar_url || undefined}
              username={user.username}
              status={user.status as any}
              size="xs"
            />
            <span className="text-sm font-medium truncate">@{user.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
