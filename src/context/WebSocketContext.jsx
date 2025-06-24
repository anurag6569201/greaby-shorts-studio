import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

const getWebSocketURL = (token) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const host = (hostname === 'localhost' || hostname === '127.0.0.1')
        ? `${hostname}:8000`
        : window.location.host;
    return `${protocol}//${host}/ws/notifications/?token=${token}`;
};

export const WebSocketProvider = ({ children }) => {
  const { tokens } = useAuth();
  const socketRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tokens?.access) {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        return;
    }

    if (socketRef.current) {
        socketRef.current.close();
    }

    const wsUrl = getWebSocketURL(tokens.access);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected successfully.");
    };

    socket.onmessage = (event) => {
      try {
          const data = JSON.parse(event.data);
          
          // --- THE FIX IS HERE ---
          // Destructure directly from 'data' instead of 'data.message'
          const { event: eventType, creation_type, creation_id, status_message } = data;
          
          if (!eventType) return; // Ignore messages without an event type

          const queryKey = [`${creation_type}Creations`];
          
          if (eventType === 'creation_progress') {
              queryClient.setQueryData(queryKey, (oldData = []) => 
                  oldData.map(item => 
                      item.id === creation_id 
                          ? { ...item, status: status_message }
                          : item
                  )
              );
          } else if (eventType === 'creation_completed' || eventType === 'creation_failed') {
              queryClient.invalidateQueries({ queryKey });
          }
      } catch (error) {
          console.error("Failed to process WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = (event) => {
      console.log(`WebSocket disconnected: Code ${event.code}, Reason: ${event.reason}`);
    };

    return () => {
      if(socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [tokens, queryClient]);

  return (
    <WebSocketContext.Provider value={null}>
      {children}
    </WebSocketContext.Provider>
  );
};