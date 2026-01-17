import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DirectMessage {
  id: string;
  name: string;
  otherUser: {
    id: string;
    username: string;
    avatar_url: string | null;
    status: string;
  };
  last_message?: {
    content: string;
    sender_username: string;
    created_at: string;
  };
  created_at: string;
}

export const useDirectMessages = () => {
  const { user } = useAuth();
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDirectMessages = useCallback(async () => {
    if (!user) return;

    // Fetch all DM rooms the user is a member of
    const { data: memberRooms, error } = await supabase
      .from('room_members')
      .select(`
        room_id,
        chat_rooms!inner (
          id,
          name,
          type,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching DMs:', error);
      setLoading(false);
      return;
    }

    // Filter only DM rooms
    const dmRooms = memberRooms
      ?.filter(mr => mr.chat_rooms && (mr.chat_rooms as any).type === 'direct')
      .map(mr => mr.chat_rooms) || [];

    // Fetch other user and last message for each DM
    const dmsWithDetails = await Promise.all(
      dmRooms.map(async (room: any) => {
        // Get the other user in the DM
        const { data: membersData } = await supabase
          .from('room_members')
          .select(`
            user_id,
            profiles (id, username, avatar_url, status)
          `)
          .eq('room_id', room.id)
          .neq('user_id', user.id)
          .limit(1)
          .single();

        const otherUser = membersData?.profiles || {
          id: '',
          username: 'Unknown',
          avatar_url: null,
          status: 'offline',
        };

        // Get last message
        const { data: messages } = await supabase
          .from('messages')
          .select(`
            content,
            created_at,
            profiles!messages_sender_id_fkey (username)
          `)
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          id: room.id,
          name: room.name,
          otherUser: otherUser as {
            id: string;
            username: string;
            avatar_url: string | null;
            status: string;
          },
          last_message: messages?.[0] ? {
            content: messages[0].content,
            sender_username: (messages[0].profiles as any)?.username || 'Unknown',
            created_at: messages[0].created_at,
          } : undefined,
          created_at: room.created_at,
        };
      })
    );

    setDirectMessages(dmsWithDetails);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDirectMessages();
  }, [fetchDirectMessages]);

  // Subscribe to room_members changes for realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dm_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
        },
        () => {
          fetchDirectMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDirectMessages]);

  // Subscribe to messages for last message updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dm_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchDirectMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDirectMessages]);

  const getOrCreateDM = async (friendId: string): Promise<string | null> => {
    if (!user) return null;

    // Check if DM already exists between these two users
    const { data: existingRooms } = await supabase
      .from('room_members')
      .select(`
        room_id,
        chat_rooms!inner (id, type)
      `)
      .eq('user_id', user.id);

    // For each room, check if it's a DM with the friend
    for (const room of existingRooms || []) {
      if ((room.chat_rooms as any)?.type !== 'direct') continue;

      const { data: members } = await supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', room.room_id);

      const memberIds = members?.map(m => m.user_id) || [];
      if (memberIds.includes(friendId) && memberIds.length === 2) {
        // DM already exists
        return room.room_id;
      }
    }

    // Create new DM room
    const { data: friend } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', friendId)
      .single();

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const roomName = `${currentProfile?.username || 'User'} & ${friend?.username || 'Friend'}`;

    const { data: newRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({
        name: roomName,
        type: 'direct',
        created_by: user.id,
      })
      .select()
      .single();

    if (roomError || !newRoom) {
      console.error('Error creating DM room:', roomError);
      return null;
    }

    // Add both users as members
    const { error: membersError } = await supabase
      .from('room_members')
      .insert([
        { room_id: newRoom.id, user_id: user.id, role: 'member' },
        { room_id: newRoom.id, user_id: friendId, role: 'member' },
      ]);

    if (membersError) {
      console.error('Error adding DM members:', membersError);
      // Clean up the room if members couldn't be added
      await supabase.from('chat_rooms').delete().eq('id', newRoom.id);
      return null;
    }

    await fetchDirectMessages();
    return newRoom.id;
  };

  return {
    directMessages,
    loading,
    getOrCreateDM,
    refreshDMs: fetchDirectMessages,
  };
};
