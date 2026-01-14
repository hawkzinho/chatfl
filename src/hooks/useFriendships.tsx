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
      // 1. Get friend profile first to validate they exist
      const { data: friendProfile, error: friendError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, status')
        .eq('id', friendId)
        .single();

      if (friendError || !friendProfile) {
        console.error('Friend profile not found:', friendError);
        toast.error('Usuário não encontrado');
        return null;
      }

      // 2. Get current user profile
      const { data: myProfile, error: myError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, status')
        .eq('id', user.id)
        .single();

      if (myError || !myProfile) {
        console.error('My profile not found:', myError);
        toast.error('Erro ao carregar seu perfil');
        return null;
      }

      // 3. Check if DM already exists between these two users
      // We need to find rooms where BOTH users are members and type is 'direct'
      const { data: myRooms } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id);

      const myRoomIds = myRooms?.map(r => r.room_id) || [];

      if (myRoomIds.length > 0) {
        // Check which of my rooms has the friend as member AND is type 'direct'
        for (const roomId of myRoomIds) {
          // Check room type
          const { data: room } = await supabase
            .from('chat_rooms')
            .select('id, type')
            .eq('id', roomId)
            .eq('type', 'direct')
            .single();

          if (room) {
            // Check if friend is a member
            const { data: friendMember } = await supabase
              .from('room_members')
              .select('id')
              .eq('room_id', roomId)
              .eq('user_id', friendId)
              .single();

            if (friendMember) {
              // DM already exists, return it
              console.log('Existing DM found:', roomId);
              return roomId;
            }
          }
        }
      }

      // 4. No existing DM found - create new one
      // DM name is stored as both usernames for internal reference
      const dmName = `DM:${myProfile.username}:${friendProfile.username}`;
      
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: dmName,
          type: 'direct',
          created_by: user.id,
        })
        .select()
        .single();

      if (roomError || !newRoom) {
        console.error('Failed to create DM room:', roomError);
        toast.error('Falha ao criar conversa');
        return null;
      }

      console.log('Created new DM room:', newRoom.id);

      // 5. Add BOTH users to the room - this is critical
      // Add current user first
      const { error: member1Error } = await supabase
        .from('room_members')
        .insert({ 
          room_id: newRoom.id, 
          user_id: user.id, 
          role: 'member' 
        });

      if (member1Error) {
        console.error('Failed to add current user to DM:', member1Error);
        // Rollback: delete the room
        await supabase.from('chat_rooms').delete().eq('id', newRoom.id);
        toast.error('Erro ao criar conversa');
        return null;
      }

      // Add friend
      const { error: member2Error } = await supabase
        .from('room_members')
        .insert({ 
          room_id: newRoom.id, 
          user_id: friendId, 
          role: 'member' 
        });

      if (member2Error) {
        console.error('Failed to add friend to DM:', member2Error);
        // Rollback: delete the room and membership
        await supabase.from('room_members').delete().eq('room_id', newRoom.id);
        await supabase.from('chat_rooms').delete().eq('id', newRoom.id);
        toast.error('Erro ao adicionar participante');
        return null;
      }

      // 6. Verify both members were added
      const { data: members, error: verifyError } = await supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', newRoom.id);

      if (verifyError || !members || members.length !== 2) {
        console.error('DM verification failed - expected 2 members, got:', members?.length);
        // Cleanup
        await supabase.from('room_members').delete().eq('room_id', newRoom.id);
        await supabase.from('chat_rooms').delete().eq('id', newRoom.id);
        toast.error('Erro ao verificar conversa');
        return null;
      }

      console.log('DM created successfully with 2 members');
      toast.success(`Conversa iniciada com ${friendProfile.username}`);
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
