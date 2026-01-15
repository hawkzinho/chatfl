import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast, playNotificationSound } from '@/lib/notifications';

const showBrowserNotification = (title: string, body: string, onClick?: () => void) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'chat-notification-' + Date.now(),
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

// Show in-app toast notification - uses silent toast to avoid double sounds
const showInAppNotification = (title: string, body: string) => {
  toast.silent.message(title, {
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

  // Subscribe to new messages across all rooms
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-messages-notifications')
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

          // Skip system messages entirely
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

          // Determine notification content
          const notificationTitle = wasMentioned 
            ? `🔔 ${senderName} mencionou você!`
            : `Nova mensagem de ${senderName}`;
          const notificationBody = newMessage.content?.substring(0, 50) + (newMessage.content?.length > 50 ? '...' : '') || 'Nova mensagem';

          // RULE: If user is INSIDE the site and in active room - NO sound, just toast for mentions
          // RULE: If user is OUTSIDE the site (different tab, minimized) - browser notification + sound
          
          if (!isDocumentVisible) {
            // User is OUTSIDE the site - play sound and show browser notification
            playNotificationSound(wasMentioned ? 0.7 : 0.5);
            showBrowserNotification(notificationTitle, notificationBody);
          } else if (!isActiveRoom) {
            // User is on site but different room - play sound + in-app toast
            playNotificationSound(wasMentioned ? 0.7 : 0.4);
            showInAppNotification(notificationTitle, notificationBody);
          } else if (wasMentioned) {
            // User is in the active room but was mentioned - just show toast (no sound since they're looking at it)
            showInAppNotification(notificationTitle, notificationBody);
          }
          // If user is in active room and no mention - no notification at all
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
    playNotificationSound(0.4);
  }, []);

  const playMentionNotification = useCallback(() => {
    playNotificationSound(0.6);
  }, []);

  return { requestPermission, playNotification, playMentionNotification };
};
