import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface MessageProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  reply_to_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  sender: MessageProfile;
  reply_to?: Message;
  reactions: { emoji: string; users: string[] }[];
}

export const useMessages = (roomId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!roomId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles!messages_sender_id_fkey (id, username, avatar_url, status)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
      return;
    }

    // Fetch reactions for all messages
    const messageIds = data.map(m => m.id);
    const { data: reactions } = await supabase
      .from('message_reactions')
      .select('message_id, emoji, user_id')
      .in('message_id', messageIds);

    // Group reactions by message and emoji
    const reactionsByMessage: Record<string, Record<string, string[]>> = {};
    reactions?.forEach(r => {
      if (!reactionsByMessage[r.message_id]) {
        reactionsByMessage[r.message_id] = {};
      }
      if (!reactionsByMessage[r.message_id][r.emoji]) {
        reactionsByMessage[r.message_id][r.emoji] = [];
      }
      reactionsByMessage[r.message_id][r.emoji].push(r.user_id);
    });

    const messagesWithReactions: Message[] = data.map(m => ({
      ...m,
      sender: m.profiles as MessageProfile,
      reactions: reactionsByMessage[m.id] 
        ? Object.entries(reactionsByMessage[m.id]).map(([emoji, users]) => ({ emoji, users }))
        : [],
    }));

    setMessages(messagesWithReactions);
    setLoading(false);
  }, [roomId, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the complete message with sender info
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                profiles!messages_sender_id_fkey (id, username, avatar_url, status)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              const newMessage: Message = {
                ...data,
                sender: data.profiles as MessageProfile,
                reactions: [],
              };
              setMessages(prev => [...prev, newMessage]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => 
              m.id === payload.new.id 
                ? { ...m, content: payload.new.content, is_edited: payload.new.is_edited }
                : m
            ));
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = async (content: string, replyToId?: string) => {
    if (!roomId || !user) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content,
        reply_to_id: replyToId || null,
      });

    if (error) {
      toast.error('Failed to send message');
      console.error(error);
    }
  };

  const editMessage = async (messageId: string, content: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .update({ content, is_edited: true })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      toast.error('Failed to edit message');
      console.error(error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      toast.error('Failed to delete message');
      console.error(error);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });

    if (error && error.code !== '23505') {
      toast.error('Failed to add reaction');
      console.error(error);
    }
    
    await fetchMessages();
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (error) {
      toast.error('Failed to remove reaction');
      console.error(error);
    }
    
    await fetchMessages();
  };

  return {
    messages,
    loading,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    refreshMessages: fetchMessages,
  };
};
