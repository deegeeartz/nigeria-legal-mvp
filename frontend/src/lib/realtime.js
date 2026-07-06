"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { apiUrl, wsUrl } from "@/lib/api";

const RealTimeContext = createContext({
  lastEvent: null,
  isConnected: false,
});

export function RealTimeProvider({ children }) {
  const { user, authFetch } = useAuth();
  const [lastEvent, setLastEvent] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectWithTicket = useCallback(async () => {
    // Close any existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Fetch a short-lived, single-use ticket from the backend
    try {
      const res = await authFetch("/api/auth/ws-ticket");
      if (!res.ok) {
        console.warn("Failed to obtain WS ticket:", res.status);
        return;
      }
      const { ticket } = await res.json();

      const url = wsUrl(`/ws?ticket=${ticket}`);
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
        // Auto-reconnect after 5 seconds if user is still authenticated
        if (user) {
          reconnectTimeoutRef.current = setTimeout(() => connectWithTicket(), 5000);
        }
      };

      socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
        socket.close();
      };
    } catch (err) {
      console.error("WS ticket fetch failed:", err);
    }
  }, [user, authFetch]);

  useEffect(() => {
    if (user) {
      connectWithTicket();
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
  }, [user, connectWithTicket]);

  return (
    <RealTimeContext.Provider value={{ lastEvent, isConnected }}>
      {children}
    </RealTimeContext.Provider>
  );
}

export const useRealTime = () => useContext(RealTimeContext);
