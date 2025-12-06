import { useState } from "react";
import { cn } from "@/lib/utils";
import { RoomListItem } from "./RoomListItem";
import { UserAvatar } from "./UserAvatar";
import { 
  Search, 
  Plus, 
  ChevronDown,
  LogOut,
  UserPlus,
  Check,
  X,
  MessageSquare,
  Link,
  Copy,
  Hash
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  inviteCode?: string;
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
  onJoinByCode?: (code: string) => void;
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
  onJoinByCode,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roomsOpen, setRoomsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [friendsOpen, setFriendsOpen] = useState(true);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [joinRoomOpen, setJoinRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [inviteCode, setInviteCode] = useState('');

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

  const handleJoinByCode = () => {
    if (!inviteCode.trim()) {
      toast.error('Invite code is required');
      return;
    }
    onJoinByCode?.(inviteCode);
    setInviteCode('');
    setJoinRoomOpen(false);
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied!');
  };

  return (
    <div className="w-72 h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gradient">ChatFlow</h1>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full animate-pulse-soft">
              {pendingRequests.length}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
        {/* Pending Friend Requests */}
        {pendingRequests.length > 0 && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
            <p className="text-xs font-semibold text-primary mb-3 flex items-center gap-2">
              <UserPlus className="w-3 h-3" />
              Friend Requests
            </p>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserAvatar
                      src={request.friend.avatar}
                      username={request.friend.username}
                      status={request.friend.status}
                      size="sm"
                    />
                    <span className="text-sm font-medium truncate">{request.friend.username}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onAcceptFriendRequest?.(request.id)}
                      className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRejectFriendRequest?.(request.id)}
                      className="p-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channels Section */}
        <Collapsible open={roomsOpen} onOpenChange={setRoomsOpen}>
          <div className="flex items-center justify-between mb-2">
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', !roomsOpen && '-rotate-90')} />
              Channels
            </CollapsibleTrigger>
            <div className="flex gap-1">
              <Dialog open={joinRoomOpen} onOpenChange={setJoinRoomOpen}>
                <DialogTrigger asChild>
                  <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Join with code">
                    <Link className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join a channel</DialogTitle>
                    <DialogDescription>
                      Enter an invite code to join a channel
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-code">Invite Code</Label>
                      <Input
                        id="invite-code"
                        placeholder="ABC12345"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        className="uppercase tracking-wider font-mono"
                      />
                    </div>
                    <Button onClick={handleJoinByCode} className="w-full">
                      Join Channel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
                <DialogTrigger asChild>
                  <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Create channel">
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a new channel</DialogTitle>
                    <DialogDescription>
                      Create a channel and share the invite code with friends
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
          </div>
          <CollapsibleContent className="space-y-1">
            {filteredRooms.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <Hash className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No channels yet
                </p>
                <button 
                  onClick={() => setCreateRoomOpen(true)}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  Create one
                </button>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div key={room.id} className="group relative">
                  <RoomListItem
                    room={room}
                    isActive={room.id === activeRoomId}
                    onClick={() => onSelectRoom(room.id)}
                  />
                  {room.inviteCode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyInviteCode(room.inviteCode!);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-muted hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-all"
                      title={`Copy: ${room.inviteCode}`}
                    >
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Direct Messages Section */}
        <Collapsible open={dmsOpen} onOpenChange={setDmsOpen}>
          <div className="flex items-center justify-between mb-2">
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', !dmsOpen && '-rotate-90')} />
              Direct Messages
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="space-y-1">
            {filteredDMs.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No conversations yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Click a friend to start chatting
                </p>
              </div>
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
          <div className="flex items-center justify-between mb-2">
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', !friendsOpen && '-rotate-90')} />
              Friends ({friends.length})
            </CollapsibleTrigger>
            <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
              <DialogTrigger asChild>
                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Add friend">
                  <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
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
                      placeholder="Enter username..."
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
              <div className="px-3 py-6 text-center">
                <UserPlus className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No friends yet
                </p>
                <button 
                  onClick={() => setAddFriendOpen(true)}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  Add some
                </button>
              </div>
            ) : (
              friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => onStartDM?.(friend.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors group"
                >
                  <UserAvatar
                    src={friend.avatar}
                    username={friend.username}
                    status={friend.status}
                    size="sm"
                  />
                  <span className="text-sm font-medium truncate flex-1 text-left">{friend.username}</span>
                  <MessageSquare className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors">
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
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
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