import { useEffect, useState } from "react";
import { io as ClientIO, Socket } from "socket.io-client";

export function useSocket(userId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Initialize server-side socket attachments proactively
    fetch("/api/socket/io").catch((err) => {
      console.error("Failed to bootstrap stateful Socket.IO server:", err);
    });

    // Create client connection mapping
    const socketInstance: Socket = ClientIO(window.location.origin, {
      path: "/api/socket/io",
      addTrailingSlash: false,
      auth: {
        userId,
      },
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketInstance.on("connect", () => {
      console.log("🔌 [SOCKET] Client established successful websocket connection.");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("🔌 [SOCKET] Client websocket disconnected. Reason:", reason);
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("🔌 [SOCKET] Client websocket handshake connection error:", err);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Auto cleanup on lifecycle unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [userId]);

  return { socket, isConnected };
}
