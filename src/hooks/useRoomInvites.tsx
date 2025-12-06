import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

interface RoomInvite {
  id: string;
  room_id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  sender: Profile;
  room: {
    id: string;
    name: string;
    description: string | null;
    type: string;
  };
}

// Notification sound
const playNotificationSound = () => {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQQF/5nfz5ZYEBog0+2oYA4YGLzt3pBOCgsJ0ujGkVQQDBrg7N+SQBILFOLY0ptXDAwb4u3cnEgMCxLf4dWaWA4OGOHt3ZtIDgsV4ePWm1oODxri7t6dSw8MF+Lj15xbEA8Z4u7fnU0QDRfj5NidXBAPGeHu4J1OERAX4+XYnV0REBnh7uCeThEQF+Pl2Z5eERIa4e/gn1ASERjk5dmeXhISGuDv4Z9QEhEY5OXanlwREhrg7+GfURIRGOTm2Z5cERIa4O/hn1ESERjk5tqeXRESGuDv4qBQExIY5ObanlwSExrg8OGgURMTGeTm2p9cEhMb4O/ioFETExnk5tqfXRMTG+Dv4qBRExMZ5OfaoF0TExvg8OKgURQTGeTn2qBdExQb4PDioVEUExrk59uhXhMUG+Dw46FRFBQa5OjboV4UFBzg8eOhUhQUGuTo26FeFBQc4PHjoVIUFBrk6NuhXhQUHODx46FSFBUV5Ojbo14UFRzg8eOhUhQUGuTo26JeFBQc4PHkoVIUFBrl6NuiXhQVHODy5KJSFBUV5ejbo14VFR3h8uSiUxUVG+Xp26NfFRUd4fLlolMVFRvl6dyjXxUVHeLy5aJTFRUb5enco18VFh3i8uWjUxYVG+Xp3KRfFRYd4vLlpFQWFRvl6d2kYBYWHeLz5aRUFhYb5endpGAWFh3i8+akVBYWG+bp3aRgFhYd4vPmpFQWFhzl6d6kYBYWHeLz5qRUFhYc5enepGAWFh3i8+akVBYWHOXp3qVgFhYd4vPmpFQWFhzl6d6lYBYWHeLz5qRUFhYc5enepl8WFh3i9OakVBYWHOXp3qZgFhYd4vTmpFQWFhzl6t6mYBYWHeLz5qRUFhYc5erepWAWFh3i9OakVBYWHOXq3qVgFhYd4vTmpFQWFhzl6t+lYBYWHeLz5qRUFhYc5erfpWAWFh3i9OamVBcWHOXq36VgFxcd4vTmpFQXFhzl6t+lYBcXHeL05qVUFxYc5erfpmAXFx3j9OamVBcWHObq36ZgFxcd4/TmpVQXFhzm6t+mYBcXHeP05qVUFxYc5urfpmAXFx3j9OelVBcXHObq4KZgFxcd4/TnpVQXFxzm6uCmYBcXHeP056VUFxcc5urgpmAXFx3j9OelVBcXHObq4KZgFxcd4/TnpVQXFxzm6uCmYBcXHeP056VUFxcc5urgpmA=');
  audio.volume = 0.5;
  audio.play().catch(() => {});
};

export const useRoomInvites = () => {
  const { user } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<RoomInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    if (!user) {
      setPendingInvites([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('room_invites')
      .select(`
        *,
        sender:profiles!room_invites_sender_id_fkey (id, username, avatar_url, status),
        room:chat_rooms!room_invites_room_id_fkey (id, name, description, type)
      `)
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
      setLoading(false);
      return;
    }

    setPendingInvites(data?.map(d => ({
      ...d,
      sender: d.sender as Profile,
      room: d.room as { id: string; name: string; description: string | null; type: string },
    })) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  // Real-time subscription for new invites
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('room-invites')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_invites',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch complete invite with sender and room info
          const { data } = await supabase
            .from('room_invites')
            .select(`
              *,
              sender:profiles!room_invites_sender_id_fkey (id, username, avatar_url, status),
              room:chat_rooms!room_invites_room_id_fkey (id, name, description, type)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const invite: RoomInvite = {
              ...data,
              sender: data.sender as Profile,
              room: data.room as { id: string; name: string; description: string | null; type: string },
            };
            setPendingInvites(prev => [invite, ...prev]);
            
            // Play notification sound
            playNotificationSound();
            
            // Show browser notification
            if (Notification.permission === 'granted') {
              new Notification(`${invite.sender.username} invited you!`, {
                body: `Join channel: ${invite.room.name}`,
                icon: '/favicon.ico',
              });
            }
            
            toast.success(`${invite.sender.username} invited you to join ${invite.room.name}!`, {
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const sendInvite = async (roomId: string, recipientId: string) => {
    if (!user) return false;

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', recipientId)
      .maybeSingle();

    if (existingMember) {
      toast.info('User is already a member of this channel');
      return false;
    }

    // Check if invite already exists
    const { data: existingInvite } = await supabase
      .from('room_invites')
      .select('id, status')
      .eq('room_id', roomId)
      .eq('recipient_id', recipientId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      toast.info('Invite already sent');
      return false;
    }

    const { error } = await supabase
      .from('room_invites')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        recipient_id: recipientId,
      });

    if (error) {
      console.error('Error sending invite:', error);
      toast.error('Failed to send invite');
      return false;
    }

    toast.success('Invite sent!');
    return true;
  };

  const acceptInvite = async (inviteId: string) => {
    if (!user) return null;

    const invite = pendingInvites.find(i => i.id === inviteId);
    if (!invite) return null;

    // Update invite status
    const { error: updateError } = await supabase
      .from('room_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId);

    if (updateError) {
      console.error('Error accepting invite:', updateError);
      toast.error('Failed to accept invite');
      return null;
    }

    // Add user to room
    const { error: joinError } = await supabase
      .from('room_members')
      .insert({
        room_id: invite.room_id,
        user_id: user.id,
        role: 'member',
      });

    if (joinError) {
      console.error('Error joining room:', joinError);
      toast.error('Failed to join channel');
      return null;
    }

    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    toast.success(`Joined ${invite.room.name}!`);
    return invite.room_id;
  };

  const rejectInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('room_invites')
      .update({ status: 'rejected' })
      .eq('id', inviteId);

    if (error) {
      console.error('Error rejecting invite:', error);
      toast.error('Failed to reject invite');
      return;
    }

    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    toast.info('Invite declined');
  };

  return {
    pendingInvites,
    loading,
    sendInvite,
    acceptInvite,
    rejectInvite,
    refreshInvites: fetchInvites,
  };
};