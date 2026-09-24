import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';

interface SSEEvent {
  type: string;
  payload: Record<string, unknown>;
}

/**
 * Custom hook for subscribing to the schedule SSE stream.
 * Automatically invalidates schedule queries when the server pushes updates.
 */
export const useScheduleSSE = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const rawBaseUrl = import.meta.env.VITE_API_URL || '';
    const baseUrl = rawBaseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/api/schedule/sse?token=${encodeURIComponent(accessToken)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('[SSE] Connected to schedule stream');
    };

    es.addEventListener('SCHEDULE_UPDATED', (event) => {
      const data = JSON.parse(event.data) as SSEEvent['payload'];
      console.log('[SSE] Schedule updated:', data);

      // Invalidate all schedule-related queries
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-today'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    });

    es.addEventListener('CONNECTED', () => {
      console.log('[SSE] Stream established');
    });

    es.onerror = () => {
      console.warn('[SSE] Connection lost, reconnecting in 5s...');
      es.close();
      eventSourceRef.current = null;

      // Exponential backoff reconnect
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };
  }, [accessToken, isAuthenticated, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);
};
