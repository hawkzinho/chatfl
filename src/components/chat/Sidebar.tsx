import { useState } from "react";
import { cn } from "@/lib/utils";
import { RoomListItem } from "./RoomListItem";
import { UserAvatar } from "./UserAvatar";
import { RoomInviteNotification } from "./RoomInviteNotification";
import { ProfileSettingsDialog } from "./ProfileSettingsDialog";
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
  MoreHorizontal,
  Users,
  Moon,
  Sun,
  Settings,
  User
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
import { useTheme } from "next-themes";

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
  type: 'public' | 'private';
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
  onJoinByCode?: (code: string) => void;
  onAcceptRoomInvite?: (inviteId: string) => Promise<string | null>;
  onRejectRoomInvite?: (inviteId: string) => Promise<void>;
  onRoomInviteAccepted?: (roomId: string) => void;
  onInviteFriendToRoom?: (friendId: string, roomId: string) => Promise<boolean>;
  onProfileUpdate?: () => void;
}

export function Sidebar({
  currentUser,
  rooms,
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
  onJoinByCode,
  onAcceptRoomInvite,
  onRejectRoomInvite,
  onRoomInviteAccepted,
  onInviteFriendToRoom,
  onProfileUpdate,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roomsOpen, setRoomsOpen] = useState(true);
  const [friendsOpen, setFriendsOpen] = useState(true);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [joinRoomOpen, setJoinRoomOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const { theme, setTheme } = useTheme();

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) {
      toast.error('Nome do canal é obrigatório');
      return;
    }
    onCreateRoom?.(newRoomName, newRoomDescription);
    setNewRoomName('');
    setNewRoomDescription('');
    setCreateRoomOpen(false);
  };

  const handleAddFriend = () => {
    if (!friendUsername.trim()) {
      toast.error('Nome de usuário é obrigatório');
      return;
    }
    onSendFriendRequest?.(friendUsername);
    setFriendUsername('');
    setAddFriendOpen(false);
  };

  const handleJoinByCode = () => {
    if (!inviteCode.trim()) {
      toast.error('Código de convite é obrigatório');
      return;
    }
    onJoinByCode?.(inviteCode);
    setInviteCode('');
    setJoinRoomOpen(false);
  };

  const handleRemoveFriend = (friendshipId: string, username: string) => {
    if (confirm(`Remover ${username} dos seus amigos?`)) {
      onRemoveFriend?.(friendshipId);
    }
  };

  const handleInviteFriendToRoom = async (friendId: string) => {
    if (!activeRoomId) {
      toast.error('Selecione um canal primeiro');
      return;
    }
    
    const activeRoom = rooms.find(r => r.id === activeRoomId);
    if (!activeRoom) {
      toast.error('Canal não encontrado');
      return;
    }

    if (onInviteFriendToRoom) {
      await onInviteFriendToRoom(friendId, activeRoomId);
    }
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const canInviteToRoom = !!activeRoom;

  return (
    <div className="w-72 h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
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
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
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
              Solicitações de Amizade
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
              Canais ({rooms.length})
            </CollapsibleTrigger>
            <div className="flex gap-0.5">
              <Dialog open={joinRoomOpen} onOpenChange={setJoinRoomOpen}>
                <DialogTrigger asChild>
                  <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Entrar com código">
                    <Link className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Entrar em um Canal</DialogTitle>
                    <DialogDescription>
                      Digite o código de convite para entrar em um canal
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-code">Código de Convite</Label>
                      <Input
                        id="invite-code"
                        placeholder="ABC12345"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        className="uppercase font-mono"
                      />
                    </div>
                    <Button onClick={handleJoinByCode} className="w-full">
                      Entrar no Canal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
                <DialogTrigger asChild>
                  <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Criar canal">
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar um Canal</DialogTitle>
                    <DialogDescription>
                      Crie um novo canal e convide seus amigos
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="room-name">Nome do Canal</Label>
                      <Input
                        id="room-name"
                        placeholder="geral"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="room-description">Descrição (opcional)</Label>
                      <Input
                        id="room-description"
                        placeholder="Um lugar para conversas gerais"
                        value={newRoomDescription}
                        onChange={(e) => setNewRoomDescription(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCreateRoom} className="w-full">
                      Criar Canal
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
                <p className="text-sm text-muted-foreground mb-1">Nenhum canal ainda</p>
                <button 
                  onClick={() => setCreateRoomOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Criar um
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

        {/* Friends Section */}
        <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
          <div className="flex items-center justify-between mb-1">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={cn('w-3 h-3 transition-transform', !friendsOpen && '-rotate-90')} />
              Amigos ({friends.length})
            </CollapsibleTrigger>
            <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
              <DialogTrigger asChild>
                <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Adicionar amigo">
                  <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Amigo</DialogTitle>
                  <DialogDescription>
                    Digite o nome de usuário do seu amigo
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="friend-username">Nome de Usuário</Label>
                    <Input
                      id="friend-username"
                      placeholder="Digite o nome de usuário..."
                      value={friendUsername}
                      onChange={(e) => setFriendUsername(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAddFriend} className="w-full">
                    Enviar Solicitação
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <CollapsibleContent className="space-y-0.5">
            {friends.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <UserPlus className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Nenhum amigo ainda</p>
                <button 
                  onClick={() => setAddFriendOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Adicionar um
                </button>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="group relative">
                  <div className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors">
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
                        {friend.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
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
                      {canInviteToRoom && onInviteFriendToRoom && (
                        <DropdownMenuItem onClick={() => handleInviteFriendToRoom(friend.id)}>
                          <Users className="w-4 h-4 mr-2" />
                          Convidar para #{activeRoom?.name}
                        </DropdownMenuItem>
                      )}
                      {friend.friendshipId && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleRemoveFriend(friend.friendshipId!, friend.username)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover Amigo
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-border">
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
                  {currentUser.status === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <User className="w-4 h-4 mr-2" />
              Editar Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 mr-2" />
                  Modo Claro
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 mr-2" />
                  Modo Escuro
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Settings Dialog */}
      <ProfileSettingsDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={currentUser}
        onProfileUpdate={onProfileUpdate}
      />
    </div>
  );
}
