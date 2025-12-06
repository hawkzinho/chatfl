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
  Hash,
  Sparkles,
  Bell,
  Trash2,
  MoreHorizontal
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

interface Friend extends User {
  friendshipId?: string;
}

interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  avatar?: string;
  inviteCode?: string;
  createdBy?: string;
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
  friends?: Friend[];
  pendingRequests?: PendingRequest[];
  onSendFriendRequest?: (username: string) => void;
  onAcceptFriendRequest?: (requestId: string) => void;
  onRejectFriendRequest?: (requestId: string) => void;
  onRemoveFriend?: (friendshipId: string) => void;
  onStartDM?: (friendId: string) => void;
  onJoinByCode?: (code: string) => void;
  onDeleteRoom?: (roomId: string) => Promise<void>;
  onLeaveRoom?: (roomId: string) => Promise<void>;
  onUpdateRoom?: (roomId: string, name: string, description: string) => Promise<void>;
  onRegenerateCode?: (roomId: string) => Promise<void>;
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
  onRemoveFriend,
  onStartDM,
  onJoinByCode,
  onDeleteRoom,
  onLeaveRoom,
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
      toast.error('Channel name is required');
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

  const handleRemoveFriend = (friendshipId: string, username: string) => {
    if (confirm(`Remove ${username} from your friends?`)) {
      onRemoveFriend?.(friendshipId);
    }
  };

  const handleDeleteDM = async (roomId: string) => {
    if (confirm('Delete this conversation?')) {
      await onLeaveRoom?.(roomId);
    }
  };

  return (
    <div className="w-80 h-full flex flex-col glass-strong border-r border-border/50">
      {/* Header */}
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-gradient">ChatFlow</h1>
          </div>
          {pendingRequests.length > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 text-[10px] font-bold bg-gradient-accent text-accent-foreground rounded-full flex items-center justify-center animate-pulse-soft">
                {pendingRequests.length}
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
        {/* Pending Friend Requests */}
        {pendingRequests.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20 animate-fade-in">
            <p className="text-xs font-semibold text-accent mb-3 flex items-center gap-2 uppercase tracking-wider">
              <UserPlus className="w-3.5 h-3.5" />
              Friend Requests
            </p>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-background/50 backdrop-blur-sm animate-slide-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      src={request.friend.avatar}
                      username={request.friend.username}
                      status={request.friend.status}
                      size="sm"
                    />
                    <span className="text-sm font-medium truncate">{request.friend.username}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onAcceptFriendRequest?.(request.id)}
                      className="p-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary transition-all hover:scale-105"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRejectFriendRequest?.(request.id)}
                      className="p-2 rounded-xl bg-destructive/20 hover:bg-destructive/30 text-destructive transition-all hover:scale-105"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channels Section */}
        <Collapsible open={roomsOpen} onOpenChange={setRoomsOpen}>
          <div className="flex items-center justify-between mb-3">
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', !roomsOpen && '-rotate-90')} />
              Channels
              <span className="text-primary/60">({rooms.length})</span>
            </CollapsibleTrigger>
            <div className="flex gap-1">
              <Dialog open={joinRoomOpen} onOpenChange={setJoinRoomOpen}>
                <DialogTrigger asChild>
                  <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors group" title="Join with code">
                    <Link className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </DialogTrigger>
                <DialogContent className="glass-strong border-border/50">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Join a Channel</DialogTitle>
                    <DialogDescription>
                      Enter an invite code to join an existing channel
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-code">Invite Code</Label>
                      <Input
                        id="invite-code"
                        placeholder="ABC12345"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        className="uppercase tracking-wider font-mono text-center h-12 text-lg rounded-xl"
                      />
                    </div>
                    <Button onClick={handleJoinByCode} className="w-full h-12 rounded-xl bg-gradient-primary hover:opacity-90 glow-hover">
                      Join Channel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
                <DialogTrigger asChild>
                  <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors group" title="Create channel">
                    <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </DialogTrigger>
                <DialogContent className="glass-strong border-border/50">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Create a Channel</DialogTitle>
                    <DialogDescription>
                      Create a new channel and invite your friends with a code
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="room-name">Channel Name</Label>
                      <Input
                        id="room-name"
                        placeholder="general"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="room-description">Description (optional)</Label>
                      <Input
                        id="room-description"
                        placeholder="A place for general discussion"
                        value={newRoomDescription}
                        onChange={(e) => setNewRoomDescription(e.target.value)}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <Button onClick={handleCreateRoom} className="w-full h-12 rounded-xl bg-gradient-primary hover:opacity-90 glow-hover">
                      Create Channel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <CollapsibleContent className="space-y-1">
            {filteredRooms.length === 0 ? (
              <div className="px-4 py-8 text-center rounded-2xl bg-muted/20 border border-dashed border-border/50">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                  <Hash className="w-7 h-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">No channels yet</p>
                <button 
                  onClick={() => setCreateRoomOpen(true)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Create your first channel
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 opacity-0 group-hover:opacity-100 transition-all"
                      title={`Copy: ${room.inviteCode}`}
                    >
                      <Copy className="w-3.5 h-3.5 text-primary" />
                    </button>
                  )}
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Direct Messages Section */}
        <Collapsible open={dmsOpen} onOpenChange={setDmsOpen}>
          <div className="flex items-center justify-between mb-3">
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', !dmsOpen && '-rotate-90')} />
              Messages
              <span className="text-primary/60">({directMessages.length})</span>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="space-y-1">
            {filteredDMs.length === 0 ? (
              <div className="px-4 py-8 text-center rounded-2xl bg-muted/20 border border-dashed border-border/50">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">No messages yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Click a friend below to start chatting
                </p>
              </div>
            ) : (
              filteredDMs.map((dm) => (
                <div key={dm.id} className="group relative">
                  <RoomListItem
                    room={dm}
                    isActive={dm.id === activeRoomId}
                    onClick={() => onSelectRoom(dm.id)}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDM(dm.id);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Friends Section */}
        <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
          <div className="flex items-center justify-between mb-3">
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', !friendsOpen && '-rotate-90')} />
              Friends
              <span className="text-primary/60">({friends.length})</span>
            </CollapsibleTrigger>
            <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
              <DialogTrigger asChild>
                <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors group" title="Add friend">
                  <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-border/50">
                <DialogHeader>
                  <DialogTitle className="text-xl">Add a Friend</DialogTitle>
                  <DialogDescription>
                    Enter your friend's username to send them a request
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="friend-username">Username</Label>
                    <Input
                      id="friend-username"
                      placeholder="Enter their username..."
                      value={friendUsername}
                      onChange={(e) => setFriendUsername(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <Button onClick={handleAddFriend} className="w-full h-12 rounded-xl bg-gradient-primary hover:opacity-90 glow-hover">
                    Send Friend Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <CollapsibleContent className="space-y-1">
            {friends.length === 0 ? (
              <div className="px-4 py-8 text-center rounded-2xl bg-muted/20 border border-dashed border-border/50">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                  <UserPlus className="w-7 h-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">No friends yet</p>
                <button 
                  onClick={() => setAddFriendOpen(true)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Add your first friend
                </button>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="group relative">
                  <button
                    onClick={() => onStartDM?.(friend.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/30 transition-all hover-lift"
                  >
                    <UserAvatar
                      src={friend.avatar}
                      username={friend.username}
                      status={friend.status}
                      size="sm"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <span className="text-sm font-medium truncate block">{friend.username}</span>
                      <span className={cn(
                        "text-xs capitalize",
                        friend.status === 'online' ? 'text-status-online' : 'text-muted-foreground'
                      )}>
                        {friend.status}
                      </span>
                    </div>
                    <MessageSquare className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  {friend.friendshipId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => handleRemoveFriend(friend.friendshipId!, friend.username)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Friend
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/30 transition-all group">
              <UserAvatar
                src={currentUser.avatar}
                username={currentUser.username}
                status={currentUser.status}
                size="md"
              />
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-sm truncate">{currentUser.username}</p>
                <p className={cn(
                  "text-xs capitalize",
                  currentUser.status === 'online' ? 'text-status-online' : 'text-muted-foreground'
                )}>
                  {currentUser.status}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-strong">
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
