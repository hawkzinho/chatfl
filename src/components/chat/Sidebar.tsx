import { useState } from "react";
import { cn } from "@/lib/utils";
import { RoomListItem } from "./RoomListItem";
import { UserAvatar } from "./UserAvatar";
import { 
  Search, 
  Plus, 
  Settings,
  Users,
  ChevronDown,
  Bell,
  LogOut,
  UserPlus,
  Check,
  X,
  MessageSquare
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
}

interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  avatar?: string;
  members: User[];
  lastMessage?: any;
  unreadCount?: number;
  createdAt: Date;
}

interface PendingRequest {
  id: string;
  friend: User;
}

interface SidebarProps {
  currentUser: User;
  rooms: ChatRoom[];
  directMessages: ChatRoom[];
  activeRoomId?: string;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom?: (name: string, description?: string) => void;
  onSignOut?: () => void;
  friends?: User[];
  pendingRequests?: PendingRequest[];
  onSendFriendRequest?: (username: string) => void;
  onAcceptFriendRequest?: (requestId: string) => void;
  onRejectFriendRequest?: (requestId: string) => void;
  onStartDM?: (friendId: string) => void;
}

export function Sidebar({
  currentUser,
  rooms,
  directMessages,
  activeRoomId,
  onSelectRoom,
  onCreateRoom,
  onSignOut,
  friends = [],
  pendingRequests = [],
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onStartDM,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roomsOpen, setRoomsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [friendsOpen, setFriendsOpen] = useState(true);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [friendUsername, setFriendUsername] = useState('');

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDMs = directMessages.filter((dm) =>
    dm.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) {
      toast.error('Room name is required');
      return;
    }
    onCreateRoom?.(newRoomName, newRoomDescription);
    setNewRoomName('');
    setNewRoomDescription('');
    setCreateRoomOpen(false);
  };

  const handleAddFriend = () => {
    if (!friendUsername.trim()) {
      toast.error('Username is required');
      return;
    }
    onSendFriendRequest?.(friendUsername);
    setFriendUsername('');
    setAddFriendOpen(false);
  };

  return (
    <div className="w-72 h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gradient">ChatFlow</h1>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
              {pendingRequests.length}
            </span>
          )}
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
        {/* Pending Friend Requests */}
        {pendingRequests.length > 0 && (
          <div className="p-2 mb-2 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs font-semibold text-primary mb-2">Friend Requests</p>
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-2 py-1">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    src={request.friend.avatar}
                    username={request.friend.username}
                    status={request.friend.status}
                    size="sm"
                  />
                  <span className="text-sm truncate">{request.friend.username}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onAcceptFriendRequest?.(request.id)}
                    className="p-1 rounded-md bg-green-500/20 hover:bg-green-500/30 text-green-500"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onRejectFriendRequest?.(request.id)}
                    className="p-1 rounded-md bg-destructive/20 hover:bg-destructive/30 text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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
            <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
              <DialogTrigger asChild>
                <button className="p-1 rounded-md hover:bg-sidebar-accent transition-colors">
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a new channel</DialogTitle>
                  <DialogDescription>
                    Create a channel to start chatting with others
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="room-name">Channel Name</Label>
                    <Input
                      id="room-name"
                      placeholder="general"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room-description">Description (optional)</Label>
                    <Input
                      id="room-description"
                      placeholder="A place for general discussion"
                      value={newRoomDescription}
                      onChange={(e) => setNewRoomDescription(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCreateRoom} className="w-full">
                    Create Channel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <CollapsibleContent className="space-y-1">
            {filteredRooms.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                No channels yet. Create one!
              </p>
            ) : (
              filteredRooms.map((room) => (
                <RoomListItem
                  key={room.id}
                  room={room}
                  isActive={room.id === activeRoomId}
                  onClick={() => onSelectRoom(room.id)}
                />
              ))
            )}
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
          </div>
          <CollapsibleContent className="space-y-1">
            {filteredDMs.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                No conversations yet
              </p>
            ) : (
              filteredDMs.map((dm) => (
                <RoomListItem
                  key={dm.id}
                  room={dm}
                  isActive={dm.id === activeRoomId}
                  onClick={() => onSelectRoom(dm.id)}
                />
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Friends Section */}
        <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
          <div className="flex items-center justify-between px-2 py-1 mt-4">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform',
                  !friendsOpen && '-rotate-90'
                )}
              />
              Friends ({friends.length})
            </CollapsibleTrigger>
            <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
              <DialogTrigger asChild>
                <button className="p-1 rounded-md hover:bg-sidebar-accent transition-colors">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a friend</DialogTitle>
                  <DialogDescription>
                    Enter your friend's username to send them a friend request
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="friend-username">Username</Label>
                    <Input
                      id="friend-username"
                      placeholder="username"
                      value={friendUsername}
                      onChange={(e) => setFriendUsername(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAddFriend} className="w-full">
                    Send Friend Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <CollapsibleContent className="space-y-1">
            {friends.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                No friends yet. Add some!
              </p>
            ) : (
              friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => onStartDM?.(friend.id)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                >
                  <UserAvatar
                    src={friend.avatar}
                    username={friend.username}
                    status={friend.status}
                    size="sm"
                  />
                  <span className="text-sm truncate flex-1 text-left">{friend.username}</span>
                  <MessageSquare className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </button>
              ))
            )}
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
              <Users className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
