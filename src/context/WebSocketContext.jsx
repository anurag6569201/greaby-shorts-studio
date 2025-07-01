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
        : import.meta.env.VITE_APP_WS_URL;
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

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        return;
    }

    const wsUrl = getWebSocketURL(tokens.access);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("✅ WebSocket connected successfully.");
    };

    socket.onmessage = (event) => {
      try {
          console.log("➡️ WebSocket message received:", event.data);
          const data = JSON.parse(event.data);
          
          const { event: eventType, creation_type, creation_id, status_message } = data;
          
          if (!eventType || !creation_type || !creation_id) {
              console.warn("WebSocket message missing required fields:", data);
              return;
          }

          const queryKeyMap = {
            'video': ['videoCreations'],
            'audio': ['audioCreations'],
            'reel': ['reels'],
          };
          
          const baseQueryKey = queryKeyMap[creation_type];
          if (!baseQueryKey) return;

          if (eventType === 'creation_progress') {
              console.log(`🔄 Updating progress for ${creation_type} ID ${creation_id}: ${status_message}`);
              // **THE ROBUST FIX IS HERE**
              // Find all existing pages for this query type and update the item in each one.
              queryClient.getQueryCache().findAll(baseQueryKey).forEach(({ queryKey }) => {
                  queryClient.setQueryData(queryKey, (oldData) => {
                      if (!oldData || !oldData.results) return oldData;
                      
                      let itemFound = false;
                      const newResults = oldData.results.map(item => {
                          if (item.id === creation_id) {
                              itemFound = true;
                              return { ...item, status: status_message || 'processing' };
                          }
                          return item;
                      });

                      if (itemFound) {
                        return {
                            ...oldData,
                            results: newResults,
                        };
                      }
                      return oldData; // Return old data if item not found on this page
                  });
              });
          } else if (eventType === 'creation_completed' || eventType === 'creation_failed') {
              console.log(`🏁 Final status for ${creation_type} ID ${creation_id}: ${eventType}`);
              // The job is done. Invalidate all pages for this query type to fetch fresh data.
              queryClient.invalidateQueries({ queryKey: baseQueryKey });

              if (eventType === 'creation_completed') {
                  toast.success(`Your ${creation_type} is ready!`, {
                    description: "The item in your library has been updated."
                  });
              } else {
                  toast.error(`Your ${creation_type} generation failed.`, {
                      description: "Please check the item for details. Credits have been refunded."
                  });
              }
          }
      } catch (error) {
          console.error("❌ Failed to process WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    socket.onclose = (event) => {
      console.log(`🔌 WebSocket disconnected: Code ${event.code}`);
      socketRef.current = null;
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