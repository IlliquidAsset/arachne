"use client";
import { useState, useEffect, useCallback } from "react";

type ConnectionStatus = "connected" | "connecting" | "disconnected";

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastChecked, setLastChecked] = useState<number>(Date.now());
  
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/auth', {
        method: 'GET'
      });
      
      if (response.ok) {
        setStatus("connected");
      } else if (response.status === 401) {
        setStatus("disconnected");
      } else {
        setStatus("disconnected");
      }
      
      setLastChecked(Date.now());
    } catch (err) {
      setStatus("disconnected");
      setLastChecked(Date.now());
    }
  }, []);
  
  useEffect(() => {
    checkConnection();
    
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, [checkConnection]);
  
  return { status, lastChecked };
}
