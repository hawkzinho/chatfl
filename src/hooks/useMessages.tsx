import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/lib/notifications';

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
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
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

    // Build a map of messages by ID for reply lookups
    const messagesById: Record<string, any> = {};
    data.forEach(m => {
      messagesById[m.id] = m;
    });

    // Fetch reactions for all messages
    const messageIds = data.map(m => m.id);
    let reactionsByMessage: Record<string, Record<string, string[]>> = {};
    
    if (messageIds.length > 0) {
      const { data: reactions } = await supabase
        .from('message_reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', messageIds);

      // Group reactions by message and emoji
      reactions?.forEach(r => {
        if (!reactionsByMessage[r.message_id]) {
          reactionsByMessage[r.message_id] = {};
        }
        if (!reactionsByMessage[r.message_id][r.emoji]) {
          reactionsByMessage[r.message_id][r.emoji] = [];
        }
        reactionsByMessage[r.message_id][r.emoji].push(r.user_id);
      });
    }

    const messagesWithReactions: Message[] = data.map(m => {
      // Look up replied message from our local map
      const replyToData = m.reply_to_id ? messagesById[m.reply_to_id] : null;

      const sender = (m.profiles as MessageProfile | null) ?? {
        id: m.sender_id,
        username: 'Unknown',
        avatar_url: null,
        status: 'offline',
      };

      const replySender = replyToData
        ? ((replyToData.profiles as MessageProfile | null) ?? {
            id: replyToData.sender_id,
            username: 'Unknown',
            avatar_url: null,
            status: 'offline',
          })
        : null;

      return {
        ...m,
        sender,
        reply_to: replyToData
          ? {
              id: replyToData.id,
              room_id: replyToData.room_id,
              sender_id: replyToData.sender_id,
              content: replyToData.content,
              reply_to_id: null,
              is_edited: false,
              created_at: replyToData.created_at,
              updated_at: replyToData.created_at,
              sender: replySender!,
              reactions: [],
            }
          : undefined,
        reactions: reactionsByMessage[m.id]
          ? Object.entries(reactionsByMessage[m.id]).map(([emoji, users]) => ({ emoji, users }))
          : [],
      };
    });

    setMessages(messagesWithReactions);
    setLoading(false);
  }, [roomId, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to realtime messages and reactions
  useEffect(() => {
    if (!roomId) return;

    const messagesChannel = supabase
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
            // Fetch the complete message with sender info and reply_to
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                profiles!messages_sender_id_fkey (id, username, avatar_url, status)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              // Fetch reply_to message if exists
              let replyToData = null;
              if (data.reply_to_id) {
                const { data: replyMsg } = await supabase
                  .from('messages')
                  .select(`
                    *,
                    profiles!messages_sender_id_fkey (id, username, avatar_url, status)
                  `)
                  .eq('id', data.reply_to_id)
                  .single();
                if (replyMsg) {
                  const replySender = (replyMsg.profiles as MessageProfile | null) ?? {
                    id: replyMsg.sender_id,
                    username: 'Unknown',
                    avatar_url: null,
                    status: 'offline',
                  };

                  replyToData = {
                    id: replyMsg.id,
                    room_id: replyMsg.room_id,
                    sender_id: replyMsg.sender_id,
                    content: replyMsg.content,
                    reply_to_id: null,
                    is_edited: false,
                    created_at: replyMsg.created_at,
                    updated_at: replyMsg.created_at,
                    sender: replySender,
                    reactions: [],
                  };
                }
              }
              
              const sender = (data.profiles as MessageProfile | null) ?? {
                id: data.sender_id,
                username: 'Unknown',
                avatar_url: null,
                status: 'offline',
              };

              const newMessage: Message = {
                ...data,
                sender,
                reply_to: replyToData || undefined,
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

    // Subscribe to reactions for real-time updates
    const reactionsChannel = supabase
      .channel(`reactions:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        async (payload) => {
          // Refetch reactions when any change happens
          const newPayload = payload.new as { message_id?: string } | undefined;
          const oldPayload = payload.old as { message_id?: string } | undefined;
          const messageId = newPayload?.message_id || oldPayload?.message_id;
          if (!messageId) return;

          // Check if this message belongs to current room
          const message = messages.find(m => m.id === messageId);
          if (!message) return;

          // Fetch updated reactions for this message
          const { data: reactions } = await supabase
            .from('message_reactions')
            .select('message_id, emoji, user_id')
            .eq('message_id', messageId);

          if (reactions) {
            const reactionsByEmoji: Record<string, string[]> = {};
            reactions.forEach(r => {
              if (!reactionsByEmoji[r.emoji]) {
                reactionsByEmoji[r.emoji] = [];
              }
              reactionsByEmoji[r.emoji].push(r.user_id);
            });

            const formattedReactions = Object.entries(reactionsByEmoji).map(([emoji, users]) => ({ emoji, users }));

            setMessages(prev => prev.map(m => 
              m.id === messageId 
                ? { ...m, reactions: formattedReactions }
                : m
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [roomId, messages]);

  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to upload file');
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(fileName);

    return { url: publicUrl, name: file.name, type: file.type };
  };

  const sendMessage = async (content: string, replyToId?: string, files?: File[]) => {
    if (!roomId || !user) return;

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;

    // Upload file if provided
    if (files && files.length > 0) {
      const uploaded = await uploadFile(files[0]);
      if (uploaded) {
        fileUrl = uploaded.url;
        fileName = uploaded.name;
        fileType = uploaded.type;
      }
    }

    const { error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content: content || (fileName ? `Sent a file: ${fileName}` : ''),
        reply_to_id: replyToId || null,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
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

  const deleteMessage = async (messageId: string, isAdmin: boolean = false) => {
    if (!user) return;

    // If admin/owner, delete directly without sender check (RLS handles permission)
    if (isAdmin) {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        toast.error('Failed to delete message');
        console.error(error);
      }
      return;
    }

    // Regular user can only delete their own messages
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
    // Real-time will handle the update
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
    // Real-time will handle the update
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
