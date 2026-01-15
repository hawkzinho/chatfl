import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash, UserMinus, Crown, Shield, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Member {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  role?: 'owner' | 'admin' | 'member';
}

interface GroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName: string;
  roomAvatar?: string;
  members: Member[];
  ownerId?: string;
  currentUserId?: string;
  currentUserRole?: 'owner' | 'admin' | 'member';
  onRemoveMember?: (userId: string) => Promise<void>;
  onUpdateMemberRole?: (userId: string, role: 'admin' | 'member') => Promise<void>;
}

export function GroupMembersDialog({
  open,
  onOpenChange,
  roomName,
  roomAvatar,
  members,
  ownerId,
  currentUserId,
  currentUserRole,
  onRemoveMember,
  onUpdateMemberRole,
}: GroupMembersDialogProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  
  const isOwner = currentUserId === ownerId;
  const isAdmin = currentUserRole === 'admin' || isOwner;

  const handleRemoveMember = async (userId: string) => {
    if (!onRemoveMember) return;
    setRemovingId(userId);
    try {
      await onRemoveMember(userId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleUpdateRole = async (userId: string, role: 'admin' | 'member') => {
    if (!onUpdateMemberRole) return;
    setUpdatingRoleId(userId);
    try {
      await onUpdateMemberRole(userId, role);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-muted-foreground';
    }
  };

  const getRoleBadge = (member: Member) => {
    if (member.id === ownerId) {
      return (
        <div className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full">
          <Crown className="w-3 h-3" />
          <span>Dono</span>
        </div>
      );
    }
    if (member.role === 'admin') {
      return (
        <div className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
          <Shield className="w-3 h-3" />
          <span>Admin</span>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {roomAvatar ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden">
                <img 
                  src={roomAvatar} 
                  alt={roomName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Hash className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <DialogTitle className="text-left">{roomName}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {members.length} {members.length === 1 ? 'membro' : 'membros'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 max-h-80 overflow-y-auto space-y-1">
          {members.map((member) => {
            const isMemberOwner = member.id === ownerId;
            const isMemberAdmin = member.role === 'admin';
            const isSelf = member.id === currentUserId;
            
            // Can remove: owner can remove anyone except themselves, admin can remove members (not other admins or owner)
            const canRemove = !isSelf && !isMemberOwner && (
              isOwner || (isAdmin && !isMemberAdmin)
            ) && onRemoveMember;
            
            // Can change role: only owner can promote/demote, but not themselves
            const canChangeRole = isOwner && !isMemberOwner && !isSelf && onUpdateMemberRole;
            
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.avatar} alt={member.username} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                        getStatusColor(member.status)
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">
                      {member.username}
                    </span>
                    {getRoleBadge(member)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {canChangeRole && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingRoleId === member.id}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {updatingRoleId === member.id ? (
                            'Alterando...'
                          ) : (
                            <>
                              Cargo
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem
                          onClick={() => handleUpdateRole(member.id, 'admin')}
                          disabled={isMemberAdmin}
                          className={cn(isMemberAdmin && "opacity-50")}
                        >
                          <Shield className="w-4 h-4 mr-2 text-blue-500" />
                          Promover a Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleUpdateRole(member.id, 'member')}
                          disabled={!isMemberAdmin}
                          className={cn(!isMemberAdmin && "opacity-50")}
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Remover Admin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingId === member.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <UserMinus className="w-4 h-4 mr-1" />
                      {removingId === member.id ? 'Removendo...' : 'Remover'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}