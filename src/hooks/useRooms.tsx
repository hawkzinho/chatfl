import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Room {
  id: string;
  name: string;
  description: string | null;
  type: string;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  invite_code: string | null;
  last_message?: {
    content: string;
    sender_username: string;
    created_at: string;
  };
  unread_count?: number;
  members?: Profile[];
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

export const useRooms = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    if (!user) return;

    const { data: memberRooms, error } = await supabase
      .from('room_members')
      .select(`
        room_id,
        chat_rooms (
          id,
          name,
          description,
          type,
          avatar_url,
          created_by,
          created_at,
          invite_code
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching rooms:', error);
      return;
    }

    const roomsData = memberRooms
      ?.filter(mr => mr.chat_rooms)
      .map(mr => mr.chat_rooms as Room) || [];

    // Fetch last message for each room
    const roomsWithMessages = await Promise.all(
      roomsData.map(async (room) => {
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

        const { data: members } = await supabase
          .from('room_members')
          .select(`
            profiles (id, username, avatar_url, status)
          `)
          .eq('room_id', room.id);

        return {
          ...room,
          last_message: messages?.[0] ? {
            content: messages[0].content,
            sender_username: (messages[0].profiles as any)?.username || 'Unknown',
            created_at: messages[0].created_at,
          } : undefined,
          members: members?.map(m => m.profiles as Profile) || [],
        };
      })
    );

    setRooms(roomsWithMessages);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, [user]);

  const createRoom = async (name: string, description?: string, type: string = 'public') => {
    if (!user) return null;

    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({
        name,
        description,
        type,
        created_by: user.id,
      })
      .select()
      .single();

    if (roomError) {
      toast.error('Failed to create room');
      console.error(roomError);
      return null;
    }

    // Add creator as owner
    await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: 'owner',
      });

    await fetchRooms();
    toast.success('Room created!');
    return room;
  };

  const joinRoom = async (roomId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('room_members')
      .insert({
        room_id: roomId,
        user_id: user.id,
        role: 'member',
      });

    if (error) {
      if (error.code === '23505') {
        toast.info('You are already a member of this room');
      } else {
        toast.error('Failed to join room');
        console.error(error);
      }
      return;
    }

    await fetchRooms();
    toast.success('Joined room!');
  };

  const leaveRoom = async (roomId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to leave room');
      console.error(error);
      return;
    }

    await fetchRooms();
    toast.info('Left room');
  };

  const deleteRoom = async (roomId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', roomId)
      .eq('created_by', user.id);

    if (error) {
      toast.error('Failed to delete room');
      console.error(error);
      return;
    }

    await fetchRooms();
    toast.success('Room deleted');
  };

  const updateRoom = async (roomId: string, name: string, description: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('chat_rooms')
      .update({ name, description })
      .eq('id', roomId)
      .eq('created_by', user.id);

    if (error) {
      toast.error('Failed to update room');
      console.error(error);
      return;
    }

    await fetchRooms();
  };

  const regenerateInviteCode = async (roomId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('chat_rooms')
      .update({ invite_code: crypto.randomUUID().substring(0, 8).toUpperCase() })
      .eq('id', roomId)
      .eq('created_by', user.id);

    if (error) {
      toast.error('Failed to regenerate invite code');
      console.error(error);
      return;
    }

    await fetchRooms();
    toast.success('Invite code regenerated!');
  };

  const joinByCode = async (inviteCode: string) => {
    if (!user) return null;

    const code = inviteCode.trim().toUpperCase();
    
    const { data: room, error: findError } = await supabase
      .from('chat_rooms')
      .select('id, name')
      .eq('invite_code', code)
      .maybeSingle();

    if (findError || !room) {
      toast.error('Invalid invite code');
      return null;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      toast.info('You are already in this room');
      return room.id;
    }

    const { error } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: 'member',
      });

    if (error) {
      toast.error('Failed to join room');
      console.error(error);
      return null;
    }

    await fetchRooms();
    toast.success(`Joined ${room.name}!`);
    return room.id;
  };

  return {
    rooms,
    loading,
    joinByCode,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    updateRoom,
    regenerateInviteCode,
    refreshRooms: fetchRooms,
  };
};
