import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Modern, smooth notification sound (gentle pop/chime)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRpQDAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXADAAAAAAoAFAAeACgAMgA8AEYAUABWAF4AYgBoAGwAbgBuAGwAaABiAFoAUABGADoALgAiABYACgAAAPoA8ADmANwA0gDKAMIAvAC4ALQAsgCwALIAtAC4AL4AxgDOANgA4gDsAPgAAgEOARoBJAEuATgBQAFIAU4BUgFUAVQBUgFOAUgBQAE2ASoBHgESAQQB+ADqANwAzgDCALQAqACcAJIAiACAAHoAdgByAHAAcAByAHYAfACCAIoAlACeAKoAtgDEANIA4gDwAAABEAEgATABPgFMAVgBZAFuAXYBfAGAAYIBgAF+AXgBcAFmAVoBTAE8ASwBGgEIAfQA3gDIALIAnACGAHIAXgBMADwALAAeABIACAAAAAAAAAAAAAAACAAQABwAKgA4AEgAWABqAHwAjgCgALIAxADWAOYA9gAEARABHAEmAS4BNgE6ATwBOgE2ATABJgEaAQ4B/gDuANwAyAC0AJ4AiAByAFwASAAyAB4ADAAAAPb/5P/S/8L/sv+k/5b/iv+A/3j/cP9s/2j/aP9o/2z/cv96/4L/jP+Y/6T/sv/C/9L/5P/2/wgAHAAwAEQAWABsAIAAkgCkALQAxADSAN4A6ADwAPgA/AD+AP4A/ADwAOIA0gDAAKoAkgB4AFoAOAAWAPT/zv+k/3r/Tv8i//T+xv6Y/mr+PP4Q/uT9uP2O/WT9PP0W/fL80PywfJJ8cHxQfDJ8FnwAfOx72HvIe7h7sHuoe6R7oHuge6R7rHu0e8B7znvge/R7Cnwi/Dz8WPx2fJZ8uHzcfAB9Jn1OfXZ9oH3KffR9IH5Mfnh+pn7Sfu5+Bn8efzJ/Rn9Uf2B/aH9uf3J/dH90f3J/bH9kf1p/Tn9Afyx/FH/8fuB+wn6ifn5+Wn40fg7+5v2+/ZT9av1A/Rb97PzC/Jj8cPxI/CD8+vvW+7L7kPtw+1D7Mvsa+wL76vrW+sT6tPqm+pj6jvqE+oD6fvp++oD6hPqM+pb6ovqw+sD60vrm+vr6EPsm+z77WPt0+5D7rvvO+/D7EvwyfFR8eHycfL582nz6fBx9QH1mfYx9tH3cfQZ+MH5afob+sv7e/gr/OP9m/5b/yP/4/ygAXACQAMQA+AAtAWEBlQHJAf0BMQJQ';

const playSound = () => {
  try {
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch (e) {
    console.log('Audio play failed:', e);
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

export const useNotifications = (currentRoomId: string | null) => {
  const { user } = useAuth();
  const lastMessageRef = useRef<string | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Subscribe to new messages across all rooms
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
          
          // Don't notify for messages in current active room (unless tab is hidden)
          if (newMessage.room_id === currentRoomId && document.visibilityState === 'visible') return;
          
          // Don't duplicate notifications
          if (lastMessageRef.current === newMessage.id) return;
          lastMessageRef.current = newMessage.id;

          // Fetch sender info
          const { data: senderData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', newMessage.sender_id)
            .single();

          const senderName = senderData?.username || 'Alguém';
          
          // Play sound
          playSound();
          
          // Show browser notification
          showBrowserNotification(
            `Nova mensagem de ${senderName}`,
            newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : '')
          );
          
          // Show toast if tab is hidden
          if (document.visibilityState === 'hidden') {
            toast.info(`${senderName}: ${newMessage.content.substring(0, 30)}...`);
          }
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

  return { requestPermission, playSound };
};