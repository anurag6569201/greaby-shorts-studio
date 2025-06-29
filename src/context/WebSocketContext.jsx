import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

    if (socketRef.current?.readyState === WebSocket.OPEN) {
        return; // Connection is already open and healthy
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
          
          // --- FIX: Destructure directly from 'data' ---
          // The backend sends the payload directly, not nested under a 'message' key.
          const { event: eventType, creation_type, creation_id, status_message } = data;
          
          if (!eventType || !creation_type) return;

          const queryKeyMap = {
            'video': ['videoCreations'],
            'audio': ['audioCreations'],
            'reel': ['reels'],
          };
          const queryKey = queryKeyMap[creation_type];
          if (!queryKey) return;
          
          if (eventType === 'creation_progress') {
              queryClient.setQueryData(queryKey, (oldData) => {
                  if (!oldData || !oldData.results) return oldData;
                  return {
                      ...oldData,
                      results: oldData.results.map(item => 
                          item.id === creation_id 
                              ? { ...item, status: status_message || item.status } // Use status_message if available
                              : item
                      )
                  };
              });
          } else if (eventType === 'creation_completed') {
              toast.success(`Your ${creation_type} is ready!`, {
                description: "The item in your library has been updated."
              });
              queryClient.invalidateQueries({ queryKey });
          } else if (eventType === 'creation_failed') {
            toast.error(`Your ${creation_type} generation failed.`, {
                description: "Please check the item in your library for details. Credits have been refunded."
            });
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
      console.log(`WebSocket disconnected: Code ${event.code}`);
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