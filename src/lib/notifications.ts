import { toast as sonnerToast, ExternalToast } from 'sonner';

// Notification sounds
const NOTIFICATION_SOUND = '/sounds/notification.mp3';

// Track last played time to prevent overlap
let lastPlayedTime = 0;
const MIN_PLAY_INTERVAL = 300; // ms - slightly shorter for responsiveness

export const playNotificationSound = (volume: number = 0.5): void => {
  try {
    const now = Date.now();
    if (now - lastPlayedTime < MIN_PLAY_INTERVAL) {
      return;
    }
    lastPlayedTime = now;
    
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.volume = Math.min(volume, 1);
    audio.play().catch(() => {
      // Audio autoplay blocked - this is expected behavior
    });
  } catch (e) {
    console.log('Audio play failed:', e);
  }
};

// Wrapper toast that plays sound with every notification
export const toast = {
  success: (message: string, data?: ExternalToast) => {
    playNotificationSound(0.4);
    return sonnerToast.success(message, data);
  },
  error: (message: string, data?: ExternalToast) => {
    playNotificationSound(0.5);
    return sonnerToast.error(message, data);
  },
  info: (message: string, data?: ExternalToast) => {
    playNotificationSound(0.3);
    return sonnerToast.info(message, data);
  },
  warning: (message: string, data?: ExternalToast) => {
    playNotificationSound(0.5);
    return sonnerToast.warning(message, data);
  },
  message: (message: string, data?: ExternalToast) => {
    playNotificationSound(0.3);
    return sonnerToast(message, data);
  },
  // For cases where we don't want sound (like silent updates)
  silent: {
    success: (message: string, data?: ExternalToast) => sonnerToast.success(message, data),
    error: (message: string, data?: ExternalToast) => sonnerToast.error(message, data),
    info: (message: string, data?: ExternalToast) => sonnerToast.info(message, data),
    warning: (message: string, data?: ExternalToast) => sonnerToast.warning(message, data),
    message: (message: string, data?: ExternalToast) => sonnerToast(message, data),
  },
};

// Re-export raw sonner toast for advanced usage
export { sonnerToast };
