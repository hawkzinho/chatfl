import { useState } from 'react';
import { cn } from '@/lib/utils';
import { UserAvatar } from './UserAvatar';
import { Users, Send, Check, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Friend {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
}

interface InviteFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friends: Friend[];
  roomName: string;
  onInvite: (friendId: string) => Promise<boolean>;
}

export function InviteFriendDialog({
  open,
  onOpenChange,
  friends,
  roomName,
  onInvite,
}: InviteFriendDialogProps) {
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [sendingIds, setSendingIds] = useState<string[]>([]);

  const handleInvite = async (friendId: string) => {
    setSendingIds(prev => [...prev, friendId]);
    const success = await onInvite(friendId);
    setSendingIds(prev => prev.filter(id => id !== friendId));
    
    if (success) {
      setInvitedIds(prev => [...prev, friendId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            Invite Friends
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Invite friends to join <span className="text-primary font-semibold">{roomName}</span>
          </p>

          {friends.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">No friends to invite</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Add some friends first!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              {friends.map((friend) => {
                const isInvited = invitedIds.includes(friend.id);
                const isSending = sendingIds.includes(friend.id);

                return (
                  <div
                    key={friend.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl transition-all',
                      'bg-muted/30 hover:bg-muted/50 border border-border/50',
                      isInvited && 'bg-primary/10 border-primary/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={friend.avatar}
                        username={friend.username}
                        status={friend.status}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-sm">{friend.username}</p>
                        <p className={cn(
                          'text-xs capitalize',
                          friend.status === 'online' ? 'text-green-400' : 'text-muted-foreground'
                        )}>
                          {friend.status}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isInvited ? 'outline' : 'default'}
                      disabled={isInvited || isSending}
                      onClick={() => handleInvite(friend.id)}
                      className={cn(
                        'rounded-xl gap-2',
                        isInvited && 'border-primary/50 text-primary'
                      )}
                    >
                      {isSending ? (
                        <span className="animate-pulse">Sending...</span>
                      ) : isInvited ? (
                        <>
                          <Check className="w-4 h-4" />
                          Invited
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Invite
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}