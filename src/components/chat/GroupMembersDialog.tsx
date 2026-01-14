import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash, UserMinus, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
}

interface GroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName: string;
  roomAvatar?: string;
  members: Member[];
  ownerId?: string;
  currentUserId?: string;
  onRemoveMember?: (userId: string) => Promise<void>;
}

export function GroupMembersDialog({
  open,
  onOpenChange,
  roomName,
  roomAvatar,
  members,
  ownerId,
  currentUserId,
  onRemoveMember,
}: GroupMembersDialogProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  
  const isOwner = currentUserId === ownerId;

  const handleRemoveMember = async (userId: string) => {
    if (!onRemoveMember) return;
    setRemovingId(userId);
    try {
      await onRemoveMember(userId);
    } finally {
      setRemovingId(null);
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
            const canRemove = isOwner && !isMemberOwner && onRemoveMember;
            
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {member.username}
                    </span>
                    {isMemberOwner && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </div>

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
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
