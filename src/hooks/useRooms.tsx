import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/lib/notifications';

// System message prefix for detection
const SYSTEM_MESSAGE_PREFIX = '🔔 SISTEMA: ';

// Send system message to chat
const sendSystemMessage = async (roomId: string, userId: string, content: string) => {
  await supabase.from('messages').insert({
    room_id: roomId,
    sender_id: userId,
    content: SYSTEM_MESSAGE_PREFIX + content,
  });
};

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
  role?: 'owner' | 'admin' | 'member';
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

    // Fetch last message and members for each room
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

        const { data: membersData } = await supabase
          .from('room_members')
          .select(`
            user_id,
            role,
            profiles (id, username, avatar_url, status)
          `)
          .eq('room_id', room.id);

        // Extract profiles from members data with role
        const members = membersData
          ?.filter(m => m.profiles)
          .map(m => ({
            ...(m.profiles as Omit<Profile, 'role'>),
            role: (m.role as 'owner' | 'admin' | 'member') || 'member',
          })) || [];

        return {
          ...room,
          last_message: messages?.[0] ? {
            content: messages[0].content,
            sender_username: (messages[0].profiles as any)?.username || 'Unknown',
            created_at: messages[0].created_at,
          } : undefined,
          members,
        };
      })
    );

    // Filter out DM rooms completely - we only show channels now
    const channelsOnly = roomsWithMessages.filter(room => room.type !== 'direct');

    setRooms(channelsOnly);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, [user]);

  // Subscribe to room_members changes for realtime join/leave updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('room_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
        },
        () => {
          // Refetch rooms when membership changes
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        toast.info('Você já é membro deste grupo');
      } else {
        toast.error('Falha ao entrar no grupo');
        console.error(error);
      }
      return;
    }

    // Get username for system message
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    // Send system message
    await sendSystemMessage(roomId, user.id, `👋 ${profile?.username || 'Alguém'} entrou no grupo`);

    await fetchRooms();
    toast.success('Entrou no grupo!');
  };

  const leaveRoom = async (roomId: string) => {
    if (!user) return;

    // Get username for system message before leaving
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    // Send system message first (while still a member)
    await sendSystemMessage(roomId, user.id, `👋 ${profile?.username || 'Alguém'} saiu do grupo`);

    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Falha ao sair do grupo');
      console.error(error);
      return;
    }

    await fetchRooms();
    toast.info('Saiu do grupo');
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

  const updateRoom = async (roomId: string, name: string, description: string, avatarUrl?: string) => {
    if (!user) return;

    const updateData: any = { name, description };
    
    // Only update avatar_url if explicitly provided (not undefined)
    if (avatarUrl !== undefined) {
      updateData.avatar_url = avatarUrl;
    }

    const { error } = await supabase
      .from('chat_rooms')
      .update(updateData)
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
      toast.info('Você já está neste grupo');
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
      toast.error('Falha ao entrar no grupo');
      console.error(error);
      return null;
    }

    // Get username for system message
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    // Send system message
    await sendSystemMessage(room.id, user.id, `👋 ${profile?.username || 'Alguém'} entrou no grupo`);

    await fetchRooms();
    toast.success(`Entrou em ${room.name}!`);
    return room.id;
  };

  const removeMember = async (roomId: string, userId: string) => {
    if (!user) return;

    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      toast.error('Grupo não encontrado');
      return;
    }

    // Get current user's role in the room
    const currentUserMember = room.members?.find(m => m.id === user.id);
    const currentUserRole = currentUserMember?.role || 'member';
    const isOwner = room.created_by === user.id;
    const isAdmin = currentUserRole === 'admin' || isOwner;

    // Check if current user has permission
    if (!isAdmin) {
      toast.error('Você não tem permissão para remover membros');
      return;
    }

    // Cannot remove yourself
    if (userId === user.id) {
      toast.error('Você não pode remover a si mesmo');
      return;
    }

    // Cannot remove the owner
    if (userId === room.created_by) {
      toast.error('Não é possível remover o dono do grupo');
      return;
    }

    // Admins cannot remove other admins (only owner can)
    const targetMember = room.members?.find(m => m.id === userId);
    if (!isOwner && targetMember?.role === 'admin') {
      toast.error('Apenas o dono pode remover administradores');
      return;
    }

    // Get the member's username for system message
    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) {
      toast.error('Falha ao remover membro');
      console.error(error);
      return;
    }

    // Send system message
    await sendSystemMessage(roomId, user.id, `🚫 ${memberProfile?.username || 'Usuário'} foi removido do grupo`);

    await fetchRooms();
    toast.success('Membro removido');
  };

  const updateMemberRole = async (roomId: string, userId: string, role: 'admin' | 'member') => {
    if (!user) return;

    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      toast.error('Grupo não encontrado');
      return;
    }

    // Only owner can change roles
    if (room.created_by !== user.id) {
      toast.error('Apenas o dono do grupo pode alterar cargos');
      return;
    }

    // Cannot change own role
    if (userId === user.id) {
      toast.error('Você não pode alterar seu próprio cargo');
      return;
    }

    const { error } = await supabase
      .from('room_members')
      .update({ role })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) {
      toast.error('Falha ao alterar cargo');
      console.error(error);
      return;
    }

    // Get the member's username for system message
    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    const roleText = role === 'admin' ? 'promovido a administrador' : 'removido como administrador';
    await sendSystemMessage(roomId, user.id, `⚙️ ${memberProfile?.username || 'Usuário'} foi ${roleText}`);

    await fetchRooms();
    toast.success(role === 'admin' ? 'Membro promovido a admin' : 'Admin removido');
  };

  const getCurrentUserRole = (roomId: string): 'owner' | 'admin' | 'member' => {
    if (!user) return 'member';
    const room = rooms.find(r => r.id === roomId);
    if (!room) return 'member';
    if (room.created_by === user.id) return 'owner';
    const member = room.members?.find(m => m.id === user.id);
    return member?.role || 'member';
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
    removeMember,
    updateMemberRole,
    getCurrentUserRole,
    refreshRooms: fetchRooms,
  };
};
