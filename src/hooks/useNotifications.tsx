import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Use the provided custom notification sound
const NOTIFICATION_SOUND = '/sounds/notification.mp3';
const MENTION_SOUND = '/sounds/notification.mp3';

// Track last played time to prevent overlap
let lastPlayedTime = 0;
const MIN_PLAY_INTERVAL = 300; // ms

const playSound = (soundPath: string, volume: number = 0.5) => {
  try {
    const now = Date.now();
    // Prevent overlapping sounds
    if (now - lastPlayedTime < MIN_PLAY_INTERVAL) {
      return null;
    }
    lastPlayedTime = now;
    
    const audio = new Audio(soundPath);
    audio.volume = Math.min(volume, 1);
    audio.play().catch(() => {
      console.log('Audio autoplay blocked');
    });
    return audio;
  } catch (e) {
    console.log('Audio play failed:', e);
    return null;
  }
};

const showBrowserNotification = (title: string, body: string) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'chat-notification',
    });
  }
};

export const useNotifications = (currentRoomId: string | null, currentUsername?: string) => {
  const { user } = useAuth();
  const lastMessageRef = useRef<string | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Subscribe to new messages across all rooms (for regular message notifications only)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as { id: string; sender_id: string; room_id: string; content: string };
          
          // Don't notify for own messages
          if (newMessage.sender_id === user.id) return;
          
          // Don't duplicate notifications
          if (lastMessageRef.current === newMessage.id) return;
          lastMessageRef.current = newMessage.id;

          // Skip system messages entirely (no notifications for them)
          if (newMessage.content.startsWith('🔔 SISTEMA: ')) return;
          
          // Don't notify for messages in current active room (unless tab is hidden)
          if (newMessage.room_id === currentRoomId && document.visibilityState === 'visible') return;

          // Fetch sender info
          const { data: senderData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', newMessage.sender_id)
            .single();

          const senderName = senderData?.username || 'Alguém';
          
          // Check if user was mentioned
          const wasMentioned = currentUsername && 
            newMessage.content.toLowerCase().includes(`@${currentUsername.toLowerCase()}`);
          
          // Play notification sound (single play, respects system volume)
          if (wasMentioned) {
            playSound(MENTION_SOUND, 0.7);
          } else {
            playSound(NOTIFICATION_SOUND, 0.5);
          }
          
          // Show browser notification
          const notificationTitle = wasMentioned 
            ? `🔔 ${senderName} mencionou você!`
            : `Nova mensagem de ${senderName}`;
          
          showBrowserNotification(
            notificationTitle,
            newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : '')
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentRoomId]);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  const playNotification = useCallback(() => {
    playSound(NOTIFICATION_SOUND, 0.4);
  }, []);

  const playMentionNotification = useCallback(() => {
    playSound(MENTION_SOUND, 0.6);
  }, []);

  return { requestPermission, playNotification, playMentionNotification };
};
