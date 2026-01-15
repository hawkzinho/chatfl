import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast, playNotificationSound } from '@/lib/notifications';


interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  friend: Profile;
}

export const useFriendships = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchedRef = useRef<string | null>(null);

  const fetchFriendships = async () => {
    if (!user) return;

    // Fetch all friendships where user is involved
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:profiles!friendships_requester_id_fkey (id, username, avatar_url, status),
        addressee:profiles!friendships_addressee_id_fkey (id, username, avatar_url, status)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) {
      console.error('Error fetching friendships:', error);
      setLoading(false);
      return;
    }

    const accepted: Friendship[] = [];
    const pending: Friendship[] = [];
    const sent: Friendship[] = [];

    data?.forEach(f => {
      const isRequester = f.requester_id === user.id;
      const friendProfile = isRequester ? f.addressee : f.requester;
      
      const friendship: Friendship = {
        id: f.id,
        requester_id: f.requester_id,
        addressee_id: f.addressee_id,
        status: f.status,
        created_at: f.created_at,
        friend: friendProfile as Profile,
      };

      if (f.status === 'accepted') {
        accepted.push(friendship);
      } else if (f.status === 'pending') {
        if (isRequester) {
          sent.push(friendship);
        } else {
          pending.push(friendship);
        }
      }
    });

    setFriends(accepted);
    setPendingRequests(pending);
    setSentRequests(sent);
    setLoading(false);
  };

  useEffect(() => {
    fetchFriendships();
  }, [user]);

  // Real-time subscription for friend requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('friendships-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${user.id}`,
        },
        async (payload) => {
          // New friend request received
          const newRequest = payload.new as { id: string; requester_id: string; status: string };
          
          if (newRequest.status === 'pending') {
            // Fetch the requester's profile
            const { data: requesterProfile } = await supabase
              .from('profiles')
              .select('id, username, avatar_url, status')
              .eq('id', newRequest.requester_id)
              .single();

            if (requesterProfile) {
              // Play notification sound
              playNotificationSound();
              
              // Show browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Nova solicitação de amizade!', {
                  body: `${requesterProfile.username} quer ser seu amigo`,
                  icon: '/favicon.ico',
                });
              }
              
              // Show in-app toast
              toast.success(`${requesterProfile.username} enviou uma solicitação de amizade!`, {
                duration: 5000,
              });
              
              // Refresh the list
              await fetchFriendships();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friendships',
        },
        async (payload) => {
          const updated = payload.new as { id: string; requester_id: string; addressee_id: string; status: string };
          
          // Only notify if user is involved
          if (updated.requester_id === user.id || updated.addressee_id === user.id) {
            if (updated.status === 'accepted' && updated.requester_id === user.id) {
              // Friend request was accepted - notify the requester
              const { data: addresseeProfile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', updated.addressee_id)
                .single();

              if (addresseeProfile) {
                playNotificationSound();
                toast.success(`${addresseeProfile.username} aceitou sua solicitação de amizade!`);
              }
            }
            // Refresh the list
            await fetchFriendships();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'friendships',
        },
        async () => {
          // Just refresh the list when any friendship is deleted
          await fetchFriendships();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const sendFriendRequest = async (username: string) => {
    if (!user) return;

    // Find user by username
    const { data: targetUser, error: findError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (findError || !targetUser) {
      toast.error('User not found');
      return;
    }

    if (targetUser.id === user.id) {
      toast.error("You can't add yourself as a friend");
      return;
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        toast.info('You are already friends with this user');
      } else if (existing.status === 'pending') {
        toast.info('Friend request already pending');
      }
      return;
    }

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: targetUser.id,
        status: 'pending',
      });

    if (error) {
      toast.error('Failed to send friend request');
      console.error(error);
      return;
    }

    await fetchFriendships();
    toast.success(`Friend request sent to ${targetUser.username}`);
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) {
      toast.error('Failed to accept friend request');
      console.error(error);
      return;
    }

    await fetchFriendships();
    toast.success('Friend request accepted!');
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      toast.error('Failed to reject friend request');
      console.error(error);
      return;
    }

    await fetchFriendships();
    toast.info('Friend request rejected');
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      toast.error('Failed to remove friend');
      console.error(error);
      return;
    }

    await fetchFriendships();
    toast.info('Friend removed');
  };

  return {
    friends,
    pendingRequests,
    sentRequests,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    refreshFriendships: fetchFriendships,
  };
};
