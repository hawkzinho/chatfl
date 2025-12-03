import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ChatRoom, User } from "@/types/chat";
import { RoomListItem } from "./RoomListItem";
import { UserAvatar } from "./UserAvatar";
import { 
  Search, 
  Plus, 
  Hash, 
  MessageCircle, 
  Settings,
  Users,
  ChevronDown,
  Bell,
  LogOut
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  currentUser: User;
  rooms: ChatRoom[];
  directMessages: ChatRoom[];
  activeRoomId?: string;
  onRoomSelect: (roomId: string) => void;
  onCreateRoom?: () => void;
  onStartDM?: () => void;
  onLogout?: () => void;
}

export function Sidebar({
  currentUser,
  rooms,
  directMessages,
  activeRoomId,
  onRoomSelect,
  onCreateRoom,
  onStartDM,
  onLogout,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roomsOpen, setRoomsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDMs = directMessages.filter((dm) => {
    const otherUser = dm.members.find((m) => m.id !== currentUser.id);
    return otherUser?.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-72 h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gradient">ChatFlow</h1>
          <button className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
            <Bell className="w-5 h-5 text-sidebar-foreground/70" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-sidebar-accent border border-sidebar-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-sidebar-primary transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2">
        {/* Rooms Section */}
        <Collapsible open={roomsOpen} onOpenChange={setRoomsOpen}>
          <div className="flex items-center justify-between px-2 py-1">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform',
                  !roomsOpen && '-rotate-90'
                )}
              />
              Channels
            </CollapsibleTrigger>
            <button
              onClick={onCreateRoom}
              className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <CollapsibleContent className="space-y-1">
            {filteredRooms.map((room) => (
              <RoomListItem
                key={room.id}
                room={room}
                isActive={room.id === activeRoomId}
                onClick={() => onRoomSelect(room.id)}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Direct Messages Section */}
        <Collapsible open={dmsOpen} onOpenChange={setDmsOpen}>
          <div className="flex items-center justify-between px-2 py-1 mt-4">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform',
                  !dmsOpen && '-rotate-90'
                )}
              />
              Direct Messages
            </CollapsibleTrigger>
            <button
              onClick={onStartDM}
              className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <CollapsibleContent className="space-y-1">
            {filteredDMs.map((dm) => (
              <RoomListItem
                key={dm.id}
                room={dm}
                isActive={dm.id === activeRoomId}
                onClick={() => onRoomSelect(dm.id)}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent transition-colors">
              <UserAvatar
                src={currentUser.avatar}
                username={currentUser.username}
                status={currentUser.status}
                size="md"
              />
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-sm truncate">{currentUser.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{currentUser.status}</p>
              </div>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <UserIcon className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function UserIcon(props: any) {
  return <Users {...props} />;
}
