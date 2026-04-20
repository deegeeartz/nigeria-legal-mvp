"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { wsUrl } from "@/lib/api";

const RealTimeContext = createContext({
  lastEvent: null,
  isConnected: false,
});

export function RealTimeProvider({ children }) {
  const { user } = useAuth();
  const [lastEvent, setLastEvent] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = (token) => {
    if (socketRef.current) {
        socketRef.current.close();
    }

    const url = wsUrl(`/ws?token=${token}`);
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      console.log("WebSocket Connected");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log("WS Event Received:", payload);
        setLastEvent(payload);
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket Disconnected");
      // Optional: Reconnect logic
      if (user?.token) {
        reconnectTimeoutRef.current = setTimeout(() => connect(user.token), 5000);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket Error:", err);
      socket.close();
    };
  };

  useEffect(() => {
    if (user?.token) {
      connect(user.token);
    } else {
        if (socketRef.current) {
            socketRef.current.close();
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user?.token]);

  return (
    <RealTimeContext.Provider value={{ lastEvent, isConnected }}>
      {children}
    </RealTimeContext.Provider>
  );
}

export const useRealTime = () => useContext(RealTimeContext);
