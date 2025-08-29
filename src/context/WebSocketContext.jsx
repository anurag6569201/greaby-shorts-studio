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
                clearTimeout(reconnectTimeoutId.current);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (!data) {
                        console.warn("WebSocket message received with empty payload.");
                        return;
                    }

                    console.log("➡️ WebSocket message received:", data);

                    const { event: eventType, creation_type, creation_id, status_message } = data;

                    if (!eventType || !creation_type || !creation_id) {
                        console.warn("WebSocket message missing required fields:", data);
                        return;
                    }

                    const queryKeyMap = {
                        'video': ['videoCreations'],
                        'audio': ['audioCreations'],
                        'reel': ['reels'],
                        'transcription': ['transcriptions'],
                        'translation': ['videoTranslations'],
                        'document': ['documentTranslations'],
                        'image': ['imageCreations'], 
                    };

                    const baseQueryKey = queryKeyMap[creation_type];
                    if (!baseQueryKey) {
                        console.log(`No query key map for creation_type: ${creation_type}`);
                        return;
                    }

                    if (eventType.includes('progress')) {
                        queryClient.getQueryCache().findAll({ queryKey: baseQueryKey }).forEach(({ queryKey }) => {
                            queryClient.setQueryData(queryKey, (oldData) => {
                                if (!oldData || !oldData.results) return oldData;
                                
                                const newData = JSON.parse(JSON.stringify(oldData));
                                
                                const itemIndex = newData.results.findIndex(item => item.id === creation_id);
                                if (itemIndex > -1) {
                                    newData.results[itemIndex].status = data.status || newData.results[itemIndex].status;
                                    // FIX: Add 'live_status' as an alias for 'status_message' for consistency
                                    newData.results[itemIndex].live_status = status_message;
                                    newData.results[itemIndex].status_message = status_message;
                                }

                                return newData;
                            });
                        });
                    } else if (eventType.includes('completed') || eventType.includes('failed')) {
                        queryClient.invalidateQueries({ queryKey: baseQueryKey });
                        queryClient.invalidateQueries({ queryKey: ['userProfile'] });

                        if (eventType.includes('completed')) {
                            toast.success(`Your ${creation_type} is ready!`, {
                                description: "The item in your library has been updated."
                            });
                        } else {
                            toast.error(`Your ${creation_type} generation has failed.`, {
                                description: "Please check the item for details. Credits (if charged) have been refunded."
                            });
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
                console.log(`🔌 WebSocket disconnected: Code ${event.code}`);
                if (event.code === 1000) return; 

                clearTimeout(reconnectTimeoutId.current);
                reconnectTimeoutId.current = setTimeout(() => {
                    console.log("Attempting to reconnect WebSocket...");
                    connect();
                }, 5000);
            };
        };

        connect();

        return () => {
            clearTimeout(reconnectTimeoutId.current);
            if (socketRef.current) {
                socketRef.current.onclose = null;
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