import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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

const showBrowserNotification = (title: string, body: string, onClick?: () => void) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'chat-notification-' + Date.now(), // Unique tag to allow multiple notifications
      requireInteraction: false,
    });
    
    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
      };
    }
    
    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }
};

// Show in-app toast notification
const showInAppNotification = (title: string, body: string) => {
  toast(title, {
    description: body,
    duration: 4000,
  });
};

export const useNotifications = (currentRoomId: string | null, currentUsername?: string) => {
  const { user } = useAuth();
  const lastMessageRef = useRef<string | null>(null);
  const hasInteracted = useRef(false);

  // Track user interaction for autoplay
  useEffect(() => {
    const handleInteraction = () => {
      hasInteracted.current = true;
    };
    
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Delay permission request slightly
      const timer = setTimeout(() => {
        Notification.requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
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
          if (newMessage.content?.startsWith('🔔 SISTEMA: ')) return;

          // Fetch sender info
          const { data: senderData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', newMessage.sender_id)
            .single();

          const senderName = senderData?.username || 'Alguém';
          
          // Check if user was mentioned
          const wasMentioned = currentUsername && newMessage.content &&
            newMessage.content.toLowerCase().includes(`@${currentUsername.toLowerCase()}`);

          const isActiveRoom = newMessage.room_id === currentRoomId;
          const isDocumentVisible = document.visibilityState === 'visible';

          // Always play notification sound (respects system volume, doesn't overlap)
          if (wasMentioned) {
            playSound(MENTION_SOUND, 0.7);
          } else if (!isActiveRoom || !isDocumentVisible) {
            playSound(NOTIFICATION_SOUND, 0.5);
          }

          // Determine notification content
          const notificationTitle = wasMentioned 
            ? `🔔 ${senderName} mencionou você!`
            : `Nova mensagem de ${senderName}`;
          const notificationBody = newMessage.content?.substring(0, 50) + (newMessage.content?.length > 50 ? '...' : '') || 'Nova mensagem';

          // Show notification based on page visibility and active room
          if (!isDocumentVisible) {
            // Page not visible - use browser notification
            showBrowserNotification(notificationTitle, notificationBody);
          } else if (!isActiveRoom || wasMentioned) {
            // Page visible but different room or mentioned - show in-app toast
            showInAppNotification(notificationTitle, notificationBody);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentRoomId, currentUsername]);

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
