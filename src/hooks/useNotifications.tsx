import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Modern, smooth notification sound (gentle pop/chime - WhatsApp style)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRsgCAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YaQCAAAFAAsAEgAaACMALAA2AD8ASABRAE1ATQBKAEQAPQA0ACoAHwATAAcA/P/w/+T/2f/O/8T/u/+z/6z/pv+h/53/mv+Y/5f/l/+Y/5r/nf+h/6b/rP+z/7v/xP/O/9n/5P/w//z/BwATAB8AKgA0AD0ARABKAEsARgA9ADIAJQAYAAoA/f/x/+X/2v/Q/8f/v/+4/7L/rf+p/6b/pf+k/6X/pv+p/6z/sP+1/7v/wv/J/9H/2f/i/+v/8//8/wQACwARABYAGgAdAB8AHwAdABoAFQAQAAkAAgD6//L/6v/j/9z/1f/Q/8v/x//E/8L/wf/A/8H/wv/E/8f/y//P/9T/2v/g/+b/7P/y//f//P8AAAQABwAJAAoACgAJAAcABAABAP7/+v/2//L/7f/p/+X/4f/d/9r/2P/W/9X/1P/U/9X/1v/X/9n/2//d/+D/4//m/+n/7P/v//L/9f/3//r//P/+/wAAAQACAAMAAwADAAIAAQAAAP///f/8//r/+f/3//b/9P/z//L/8f/w//D/8P/w//D/8f/x//L/8//0//X/9v/3//j/+f/6//v//P/8//3//v/+////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADw/+T/2P/M/8D/tP+o/53/kv+I/37/dP9r/2P/W/9U/03/R/9C/z7/O/84/zX/Mv8w/y//Lv8t/y3/Lf8u/y//MP8y/zX/OP87/z7/Qv9H/03/VP9b/2P/a/90/37/iP+S/53/qP+0/8D/zP/Y/+T/8P/8/wgAFAAg';

// Call ringtone sound
const CALL_RINGTONE = 'data:audio/wav;base64,UklGRqQHAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YYAHAABkAGQAZABkAGQAZABkAGQAZABkAMgAyADIAMgAyADIAMgAyADIAMgA+AD4APgA+AD4APgA+AD4APgA+AAoASgBKAEoASgBKAEoASgBKAEoAVgBWAFYAVgBWAFYAVgBWAFYAVgBiAGIAYgBiAGIAYgBiAGIAYgBiAG4AbgBuAG4AbgBuAG4AbgBuAG4AegB6AHoAegB6AHoAegB6AHoAegBGAIYAhgCGAIYAhgCGAIYAhgCGAJIAkgCSAJIAkgCSAJIAkgCSAJIAoACgAKAAoACgAKAAoACgAKAAoACsAKwArACsAKwArACsAKwArACsALgAuAC4ALgAuAC4ALgAuAC4ALgAsACwALAAsACwALAAsACwALAAsACgAKAAoACgAKAAoACgAKAAoACgAJAAkACQAJAAkACQAJAAkACQAJAAgACAAIAAgACAAIAAgACAAIAAgABwAHAAcABwAHAAcABwAHAAcABwAGAAYABgAGAAYABgAGAAYABgAGAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAADwAPAA8ADwAPAA8ADwAPAA8ACAAIAAgACAAIAAgACAAIAAgACAD4//j/+P/4//j/+P/4//j/+P/4/+j/6P/o/+j/6P/o/+j/6P/o/+j/2P/Y/9j/2P/Y/9j/2P/Y/9j/2P/I/8j/yP/I/8j/yP/I/8j/yP/I/7j/uP+4/7j/uP+4/7j/uP+4/7j/qP+o/6j/qP+o/6j/qP+o/6j/qP+Y/5j/mP+Y/5j/mP+Y/5j/mP+Y/4j/iP+I/4j/iP+I/4j/iP+I/4j/eP94/3j/eP94/3j/eP94/3j/eP9o/2j/aP9o/2j/aP9o/2j/aP9o/1j/WP9Y/1j/WP9Y/1j/WP9Y/1j/SP9I/0j/SP9I/0j/SP9I/0j/SP84/zj/OP84/zj/OP84/zj/OP84/yj/KP8o/yj/KP8o/yj/KP8o/yj/GP8Y/xj/GP8Y/xj/GP8Y/xj/GP8I/wj/CP8I/wj/CP8I/wj/CP8I//j++P74/vj++P74/vj++P74/vj+6P7o/uj+6P7o/uj+6P7o/uj+6P7Y/tj+2P7Y/tj+2P7Y/tj+2P7Y/sj+yP7I/sj+yP7I/sj+yP7I/sj+uP64/rj+uP64/rj+uP64/rj+uP6o/qj+qP6o/qj+qP6o/qj+qP6o/qj+qP6o/qj+qP6o/qj+qP6o/qj+uP64/rj+uP64/rj+uP64/rj+uP7I/sj+yP7I/sj+yP7I/sj+yP7I/tj+2P7Y/tj+2P7Y/tj+2P7Y/tj+6P7o/uj+6P7o/uj+6P7o/uj+6P74/vj++P74/vj++P74/vj++P74/gj/CP8I/wj/CP8I/wj/CP8I/wj/GP8Y/xj/GP8Y/xj/GP8Y/xj/GP8o/yj/KP8o/yj/KP8o/yj/KP8o/zj/OP84/zj/OP84/zj/OP84/zj/SP9I/0j/SP9I/0j/SP9I/0j/SP9Y/1j/WP9Y/1j/WP9Y/1j/WP9Y/2j/aP9o/2j/aP9o/2j/aP9o/2j/eP94/3j/eP94/3j/eP94/3j/eP+I/4j/iP+I/4j/iP+I/4j/iP+I/5j/mP+Y/5j/mP+Y/5j/mP+Y/5j/qP+o/6j/qP+o/6j/qP+o/6j/qP+4/7j/uP+4/7j/uP+4/7j/uP+4/8j/yP/I/8j/yP/I/8j/yP/I/8j/2P/Y/9j/2P/Y/9j/2P/Y/9j/2P/o/+j/6P/o/+j/6P/o/+j/6P/o//j/+P/4//j/+P/4//j/+P/4//j/CAAIAAgACAAIAAgACAAIAAgACAAPAA8ADwAPAA8ADwAPAA8ADwAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQABAAEAAQABAAEAAQABAAEAAgACAAIAAgACAAIAAgACAAIAAgADAAMAAwADAAMAAwADAAMAAwADAAQABAAEAAQABAAEAAQABAAEAAQABwAHAAcABwAHAAcABwAHAAcABwAIAAgACAAIAAgACAAIAAgACAAIAAkACQAJAAkACQAJAAkACQAJAAkACgAKAAoACgAKAAoACgAKAAoACgALAAsACwALAAsACwALAAsACwALAAwADAAMAAwADAAMAAwADAAMAAwAMgAyADIAMgAyADIAMgAyADIAMgA';

const playSound = (soundData: string, volume: number = 0.4) => {
  try {
    const audio = new Audio(soundData);
    audio.volume = volume;
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
          
          // Play notification sound
          playSound(NOTIFICATION_SOUND, 0.4);
          
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

  const playNotification = useCallback(() => {
    playSound(NOTIFICATION_SOUND, 0.4);
  }, []);

  const playRingtone = useCallback(() => {
    return playSound(CALL_RINGTONE, 0.5);
  }, []);

  return { requestPermission, playNotification, playRingtone };
};