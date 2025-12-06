import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Notification sound as base64
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQQF/5nfz5ZYEBog0+2oYA4YGLzt3pBOCgsJ0ujGkVQQDBrg7N+SQBILFOLY0ptXDAwb4u3cnEgMCxLf4dWaWA4OGOHt3ZtIDgsV4ePWm1oODxri7t6dSw8MF+Lj15xbEA8Z4u7fnU0QDRfj5NidXBAPGeHu4J1OERAX4+XYnV0REBnh7uCeThEQF+Pl2Z5eERIa4e/gn1ASERjk5dmeXhISGuDv4Z9QEhEY5OXanlwREhrg7+GfURIRGOTm2Z5cERIa4O/hn1ESERjk5tqeXRESGuDv4qBQExIY5ObanlwSExrg8OGgURMTGeTm2p9cEhMb4O/ioFETExnk5tqfXRMTG+Dv4qBRExMZ5OfaoF0TExvg8OKgURQTGeTn2qBdExQb4PDioVEUExrk59uhXhMUG+Dw46FRFBQa5OjboV4UFBzg8eOhUhQUGuTo26FeFBQc4PHjoVIUFBrk6NuhXhQUHODx46FSFBUV5Ojbo14UFRzg8eOhUhQUGuTo26JeFBQc4PHkoVIUFBrl6NuiXhQVHODy5KJSFBUV5ejbo14VFR3h8uSiUxUVG+Xp26NfFRUd4fLlolMVFRvl6dyjXxUVHeLy5aJTFRUb5enco18VFh3i8uWjUxYVG+Xp3KRfFRYd4vLlpFQWFRvl6d2kYBYWHeLz5aRUFhYb5endpGAWFh3i8+akVBYWG+bp3aRgFhYd4vPmpFQWFhzl6d6kYBYWHeLz5qRUFhYc5enepGAWFh3i8+akVBYWHOXp3qVgFhYd4vPmpFQWFhzl6d6lYBYWHeLz5qRUFhYc5enepl8WFh3i9OakVBYWHOXp3qZgFhYd4vTmpFQWFhzl6t6mYBYWHeLz5qRUFhYc5erepWAWFh3i9OakVBYWHOXq3qVgFhYd4vTmpFQWFhzl6t+lYBYWHeLz5qRUFhYc5erfpWAWFh3i9OamVBcWHOXq36VgFxcd4vTmpFQXFhzl6t+lYBcXHeL05qVUFxYc5erfpmAXFx3j9OamVBcWHObq36ZgFxcd4/TmpVQXFhzm6t+mYBcXHeP05qVUFxYc5urfpmAXFx3j9OelVBcXHObq4KZgFxcd4/TnpVQXFxzm6uCmYBcXHeP056VUFxcc5urgpmAXFx3j9OelVBcXHObq4KZgFxcd4/TnpVQXFxzm6uCmYBcXHeP056VUFxcc5urgpmA=';

const playSound = () => {
  try {
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.volume = 0.5;
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

          const senderName = senderData?.username || 'Someone';
          
          // Play sound
          playSound();
          
          // Show browser notification
          showBrowserNotification(
            `New message from ${senderName}`,
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