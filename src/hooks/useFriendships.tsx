import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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

  const startDirectMessage = async (friendId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Check if DM room already exists
      const { data: existingRooms } = await supabase
        .from('room_members')
        .select(`
          room_id,
          chat_rooms!inner (id, type)
        `)
        .eq('user_id', user.id);

      for (const room of existingRooms || []) {
        if ((room.chat_rooms as any).type === 'direct') {
          const { data: members } = await supabase
            .from('room_members')
            .select('user_id')
            .eq('room_id', room.room_id);
          
          const memberIds = members?.map(m => m.user_id) || [];
          if (memberIds.includes(friendId) && memberIds.length === 2) {
            // DM already exists, return it immediately
            return room.room_id;
          }
        }
      }

      // Create new DM room
      const { data: friend } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', friendId)
        .single();

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: `${myProfile?.username} & ${friend?.username}`,
          type: 'direct',
          created_by: user.id,
        })
        .select()
        .single();

      if (roomError) {
        console.error('Failed to create DM room:', roomError);
        toast.error('Falha ao criar conversa');
        return null;
      }

      // Add both users to the room - do this sequentially to avoid race conditions
      const { error: member1Error } = await supabase
        .from('room_members')
        .insert({ room_id: newRoom.id, user_id: user.id, role: 'member' });

      if (member1Error) {
        console.error('Failed to add current user to DM:', member1Error);
      }

      const { error: member2Error } = await supabase
        .from('room_members')
        .insert({ room_id: newRoom.id, user_id: friendId, role: 'member' });

      if (member2Error) {
        console.error('Failed to add friend to DM:', member2Error);
      }

      toast.success(`Conversa iniciada com ${friend?.username}`);
      return newRoom.id;
    } catch (error) {
      console.error('Error in startDirectMessage:', error);
      toast.error('Erro ao iniciar conversa');
      return null;
    }
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
    startDirectMessage,
    refreshFriendships: fetchFriendships,
  };
};
