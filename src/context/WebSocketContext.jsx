// src/contexts/WebSocketProvider.jsx

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

const getWebSocketURL = (token) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    // Ensure VITE_APP_WS_URL is set in your .env file for production/staging environments
    const host = (hostname === 'localhost' || hostname === '127.0.0.1')
        ? `${hostname}:8000`
        : import.meta.env.VITE_APP_WS_URL || window.location.host;
    return `${protocol}//${host}/ws/notifications/?token=${token}`;
};

export const WebSocketProvider = ({ children }) => {
    const { tokens } = useAuth();
    const socketRef = useRef(null);
    const queryClient = useQueryClient();
    const reconnectTimeoutId = useRef(null);

    useEffect(() => {
        const connect = () => {
            if (!tokens?.access || (socketRef.current && socketRef.current.readyState === WebSocket.OPEN)) {
                return;
            }

            const wsUrl = getWebSocketURL(tokens.access);
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log("✅ WebSocket connected successfully.");
                if (reconnectTimeoutId.current) {
                    clearTimeout(reconnectTimeoutId.current);
                }
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (!data) return;

                    console.log("➡️ WebSocket message received:", data);

                    const { event: eventType, creation_type, creation_id, status_message } = data;

                    if (!eventType || !creation_type || !creation_id) return;

                    const queryKeyMap = {
                        'video': ['videoCreations'],
                        'audio': ['audioCreations'],
                        'reel': ['reels'],
                        'transcription': ['transcriptions'],
                        'translation': ['videoTranslations'],
                    };

                    const baseQueryKey = queryKeyMap[creation_type];
                    if (!baseQueryKey) return;

                    if (eventType.includes('progress')) {
                        queryClient.getQueryCache().findAll({ queryKey: baseQueryKey }).forEach(({ queryKey }) => {
                            queryClient.setQueryData(queryKey, (oldData) => {
                                if (!oldData || !oldData.results) return oldData;
                                
                                const newData = JSON.parse(JSON.stringify(oldData));
                                const itemIndex = newData.results.findIndex(item => item.id === creation_id);
                                
                                if (itemIndex > -1) {
                                    newData.results[itemIndex].status = data.status || 'processing';
                                    newData.results[itemIndex].live_status = status_message;
                                }
                                return newData;
                            });
                        });
                    } else if (eventType.includes('completed') || eventType.includes('failed')) {
                        // FIX: Optimistically update the cache with the final status.
                        queryClient.getQueryCache().findAll({ queryKey: baseQueryKey }).forEach(({ queryKey }) => {
                            queryClient.setQueryData(queryKey, (oldData) => {
                               if (!oldData || !oldData.results) return oldData;
                                
                                const newData = JSON.parse(JSON.stringify(oldData));
                                const itemIndex = newData.results.findIndex(item => item.id === creation_id);

                                if (itemIndex > -1) {
                                    // This is the crucial fix: Set the final status.
                                    // This immediately updates the UI to show "Completed" or "Failed",
                                    // which stops the loader and enables the "View Details" button.
                                    newData.results[itemIndex].status = eventType.includes('completed') ? 'completed' : 'failed';
                                    
                                    // Clear the temporary live status message.
                                    delete newData.results[itemIndex].live_status;
                                }
                                return newData;
                            });
                        });

                        // Now, invalidate the query to fetch the final, complete data from the server.
                        // This ensures the local cache is perfectly in sync and has all necessary data,
                        // like the final audio URL needed for the player.
                        queryClient.invalidateQueries({ queryKey: baseQueryKey });
                        queryClient.invalidateQueries({ queryKey: ['userProfile'] });

                        if (eventType.includes('completed')) {
                            toast.success(`Your ${creation_type} is ready!`, { description: "Click 'View Details' to see the result." });
                        } else {
                            toast.error(`Your ${creation_type} generation has failed.`, { description: status_message || "An unexpected error occurred." });
                        }
                    }
                } catch (error) {
                    console.error("❌ Failed to process WebSocket message:", error, "Data:", event.data);
                }
            };

            socket.onerror = (error) => {
                console.error("❌ WebSocket error:", error);
                socket.close();
            };

            socket.onclose = (event) => {
                console.log(`🔌 WebSocket disconnected: Code ${event.code}, Reason: ${event.reason}`);
                // Don't reconnect for normal closure or auth errors
                if (event.code === 1000 || event.code === 4003) return; 
                
                if (reconnectTimeoutId.current) {
                    clearTimeout(reconnectTimeoutId.current);
                }
                reconnectTimeoutId.current = setTimeout(() => {
                    console.log("Attempting to reconnect WebSocket...");
                    connect();
                }, 5000);
            };
        };

        connect();

        return () => {
            if (reconnectTimeoutId.current) {
                clearTimeout(reconnectTimeoutId.current);
            }
            if (socketRef.current) {
                socketRef.current.onclose = null; // Prevent onclose from firing on manual close
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [tokens, queryClient]);

    return (
        <WebSocketContext.Provider value={null}>
            {children}
        </WebSocketContext.Provider>
    );
};