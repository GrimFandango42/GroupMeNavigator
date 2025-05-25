import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  groupId?: string;
  message?: any;
}

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export function useWebSocket(groupId?: string) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<NodeJS.Timeout | null>(null);
  // Flag to prevent reconnection attempts after intentional close
  const intentionalClose = useRef(false);


  const connect = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }

    // If already connected or connecting, don't try again
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    intentionalClose.current = false; // Reset flag on new connection attempt
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`[WebSocket] Attempting to connect (groupId: ${groupId}, attempt: ${retryCount.current + 1})`);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log(`[WebSocket] Connection established. (groupId: ${groupId})`);
      setIsConnected(true);
      retryCount.current = 0; // Reset retry count on successful connection
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      if (groupId) {
        console.log('[WebSocket] Sending join_group for group:', groupId);
        ws.current?.send(JSON.stringify({ type: 'join_group', groupId }));
      }
    };

    ws.current.onclose = (event) => {
      // Adjusted log to match specific requirement
      console.log(`[WebSocket] Connection closed. Intentional: ${intentionalClose.current}, Code: ${event.code}, Reason: ${event.reason} (groupId: ${groupId})`);
      setIsConnected(false);
      if (!intentionalClose.current) {
        if (retryCount.current < MAX_RETRIES) {
          const delay = Math.pow(2, retryCount.current) * INITIAL_RETRY_DELAY;
          // Adjusted log to match specific requirement
          console.log(`[WebSocket] Attempting to reconnect (attempt ${retryCount.current + 1}) in ${delay / 1000}s...`);
          retryTimer.current = setTimeout(() => {
            retryCount.current++;
            connect();
          }, delay);
        } else {
          console.error(`[WebSocket] Max reconnection attempts reached for groupId: ${groupId}`);
        }
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const parsedMessage = JSON.parse(event.data as string);
        // Added log for received message
        console.log('[WebSocket] Received message:', parsedMessage);
        setLastMessage(parsedMessage);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    ws.current.onerror = (event) => {
      // Adjusted log to match specific requirement - event itself might not be as descriptive as error object.
      // The browser usually logs the WebSocket error event object which is quite informative.
      console.error('[WebSocket] Error:', event);
    };
  }, [groupId]);

  useEffect(() => {
    connect(); // Initial connection attempt

    return () => {
      console.log(`[WebSocket] Cleaning up (groupId: ${groupId})`);
      intentionalClose.current = true; // Mark closure as intentional
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      retryCount.current = 0; // Reset retries when effect cleans up or groupId changes
    };
  }, [groupId, connect]);

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket: Attempted to send message while not connected.');
    }
  };

  return { isConnected, lastMessage, sendMessage };
}
