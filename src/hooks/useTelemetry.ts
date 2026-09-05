import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../types/database';

type EventType = Database['public']['Enums']['event_type'];

export function useTelemetry() {
  const { user } = useAuth();

  const trackEvent = useCallback(
    async (eventType: EventType, metadata: Record<string, any> = {}) => {
      if (!user) return;
      try {
        await supabase.from('events').insert({
          user_id: user.id,
          tipo_evento: eventType,
          metadata
        });
      } catch (err) {
        // Silently fail telemetry errors
        console.error('Failed to track event', err);
      }
    },
    [user]
  );

  return { trackEvent };
}
