import { useState } from "react";
import { cn } from "@/lib/utils";
import { RoomListItem } from "./RoomListItem";
import { UserAvatar } from "./UserAvatar";
import { RoomInviteNotification } from "./RoomInviteNotification";
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
  Hash,
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

interface RoomInvite {
  id: string;
  room_id: string;
  sender: {
    id: string;
    username: string;
    avatar_url: string | null;
    status: string;
  };
  room: {
    id: string;
    name: string;
    description: string | null;
    type: string;
  };
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
  roomInvites?: RoomInvite[];
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
  onAcceptRoomInvite?: (inviteId: string) => Promise<string | null>;
  onRejectRoomInvite?: (inviteId: string) => Promise<void>;
  onRoomInviteAccepted?: (roomId: string) => void;
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
  roomInvites = [],
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onRemoveFriend,
  onStartDM,
  onJoinByCode,
  onLeaveRoom,
  onAcceptRoomInvite,
  onRejectRoomInvite,
  onRoomInviteAccepted,
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
    <div className="w-72 h-full flex flex-col bg-sidebar-background border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold">ChatFlow</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
        {/* Room Invites */}
        {roomInvites.length > 0 && onAcceptRoomInvite && onRejectRoomInvite && (
          <RoomInviteNotification
            invites={roomInvites}
            onAccept={onAcceptRoomInvite}
            onReject={onRejectRoomInvite}
            onRoomJoined={onRoomInviteAccepted}
          />
        )}

        {/* Pending Friend Requests */}
        {pendingRequests.length > 0 && (
          <div className="p-3 rounded-md bg-muted/50 border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <UserPlus className="w-3 h-3" />
              Friend Requests
            </p>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
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
                      className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRejectFriendRequest?.(request.id)}
                      className="p-1.5 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
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
          <div className="flex items-center justify-between mb-1">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={cn('w-3 h-3 transition-transform', !roomsOpen && '-rotate-90')} />
              Channels ({rooms.length})
            </CollapsibleTrigger>
            <div className="flex gap-0.5">
              <Dialog open={joinRoomOpen} onOpenChange={setJoinRoomOpen}>
                <DialogTrigger asChild>
                  <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Join with code">
                    <Link className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join a Channel</DialogTitle>
                    <DialogDescription>
                      Enter an invite code to join an existing channel
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
                        className="uppercase font-mono"
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
                  <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Create channel">
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a Channel</DialogTitle>
                    <DialogDescription>
                      Create a new channel and invite your friends
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
          <CollapsibleContent className="space-y-0.5">
            {filteredRooms.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <Hash className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No channels yet</p>
                <button 
                  onClick={() => setCreateRoomOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Create one
                </button>
              </div>
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
          <div className="flex items-center justify-between mb-1">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={cn('w-3 h-3 transition-transform', !dmsOpen && '-rotate-90')} />
              Messages ({directMessages.length})
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="space-y-0.5">
            {filteredDMs.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded bg-destructive/10 hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Friends Section */}
        <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
          <div className="flex items-center justify-between mb-1">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={cn('w-3 h-3 transition-transform', !friendsOpen && '-rotate-90')} />
              Friends ({friends.length})
            </CollapsibleTrigger>
            <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
              <DialogTrigger asChild>
                <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Add friend">
                  <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a Friend</DialogTitle>
                  <DialogDescription>
                    Enter your friend's username to send them a request
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="friend-username">Username</Label>
                    <Input
                      id="friend-username"
                      placeholder="Enter their username..."
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
          <CollapsibleContent className="space-y-0.5">
            {friends.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <UserPlus className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No friends yet</p>
                <button 
                  onClick={() => setAddFriendOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Add one
                </button>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="group relative">
                  <button
                    onClick={() => onStartDM?.(friend.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <UserAvatar
                      src={friend.avatar}
                      username={friend.username}
                      status={friend.status}
                      size="sm"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <span className="text-sm truncate block">{friend.username}</span>
                      <span className={cn(
                        "text-xs capitalize",
                        friend.status === 'online' ? 'text-green-600' : 'text-muted-foreground'
                      )}>
                        {friend.status}
                      </span>
                    </div>
                  </button>
                  {friend.friendshipId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
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
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors">
              <UserAvatar
                src={currentUser.avatar}
                username={currentUser.username}
                status={currentUser.status}
                size="sm"
              />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{currentUser.username}</p>
                <p className={cn(
                  "text-xs capitalize",
                  currentUser.status === 'online' ? 'text-green-600' : 'text-muted-foreground'
                )}>
                  {currentUser.status}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
