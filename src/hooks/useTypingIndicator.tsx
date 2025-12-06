import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TypingUser {
  id: string;
  username: string;
}

export const useTypingIndicator = (roomId: string | null) => {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomId || !user || !profile) return;

    const channel = supabase.channel(`typing:${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.user_id !== user.id && presence.is_typing) {
              users.push({
                id: presence.user_id,
                username: presence.username,
              });
            }
          });
        });
        
        setTypingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            username: profile.username,
            is_typing: false,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user, profile]);

  const startTyping = useCallback(async () => {
    if (!channelRef.current || !user || !profile) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Track typing state
    await channelRef.current.track({
      user_id: user.id,
      username: profile.username,
      is_typing: true,
    });

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(async () => {
      if (channelRef.current && user && profile) {
        await channelRef.current.track({
          user_id: user.id,
          username: profile.username,
          is_typing: false,
        });
      }
    }, 3000);
  }, [user, profile]);

  const stopTyping = useCallback(async () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (channelRef.current && user && profile) {
      await channelRef.current.track({
        user_id: user.id,
        username: profile.username,
        is_typing: false,
      });
    }
  }, [user, profile]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
};
