import { useCallback, useEffect, useRef } from 'react';
import { useSettings } from './useSettings';
import { initAudio, playSound } from '../utils/sound';

export function useSound() {
  const { settings } = useSettings();
  const initialized = useRef(false);

  useEffect(() => {
    const handleInteraction = () => {
      if (!initialized.current) {
        initAudio();
        initialized.current = true;
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  const playNotificationSound = useCallback(() => {
    if (settings.sound.enabled) {
      playSound(settings.sound.soundType, settings.sound.volume);
    }
  }, [settings.sound]);

  return { playNotificationSound };
}
