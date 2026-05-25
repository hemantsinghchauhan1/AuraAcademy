import { NextApiRequest } from "next";
import { Server as NetServer } from "http";
import { Server as ServerIO } from "socket.io";
import { NextApiResponseServerIo } from "@/types/socket";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Global in-memory maps to track user presence across sockets
// userId -> Set of active socket.id's (to handle multiple open browser tabs)
const onlineUsers = new Map<string, Set<string>>();
// socketId -> userId (for speedy disconnect lookups)
const socketToUser = new Map<string, string>();

const ioHandler = (req: NextApiRequest, res: any) => {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  console.log("⚡ [SOCKET] Initializing stateful Socket.IO server...");
  const path = "/api/socket/io";
  const httpServer: NetServer = res.socket.server as any;
  
  const io = new ServerIO(httpServer, {
    path: path,
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Attach connection middleware for Clerk userId verification
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
    if (!userId || typeof userId !== "string") {
      console.error("❌ [SOCKET] Authentication failed: Missing userId in handshake.");
      return next(new Error("Authentication error: Missing userId"));
    }
    
    socket.data.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const socketId = socket.id;

    console.log(`🔌 [SOCKET] Client connected: ${socketId} (User: ${userId})`);

    // 1. Presence Registry: Record new socket session
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    
    const userSockets = onlineUsers.get(userId)!;
    const isFirstConnection = userSockets.size === 0;
    userSockets.add(socketId);
    socketToUser.set(socketId, userId);

    // If user transitioned offline -> online, broadcast presence update
    if (isFirstConnection) {
      console.log(`🟢 [PRESENCE] User ${userId} is now ONLINE.`);
      io.emit("user:online", { userId });
    }

    // Personal user-scoped room for targeted direct messaging alerts
    socket.join(`user:${userId}`);
    socket.join(`user:${userId}:notifications`);
    console.log(`🔔 [NOTIFICATIONS] Socket ${socketId} joined user:${userId}:notifications`);

    // Instantly supply the newly connected client with initial online user list
    socket.emit("presence:initial", Array.from(onlineUsers.keys()).filter(id => onlineUsers.get(id)!.size > 0));

    // 2. Room Joining logic for active DMs
    socket.on("room:join", ({ conversationId }) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
        console.log(`👥 [ROOM] Socket ${socketId} joined conversation:${conversationId}`);
      }
    });

    socket.on("room:leave", ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        console.log(`🚪 [ROOM] Socket ${socketId} left conversation:${conversationId}`);
      }
    });

    // Mass subscription for sidebar inbox items to capture global notifications
    socket.on("rooms:join", ({ conversationIds }) => {
      if (Array.isArray(conversationIds)) {
        conversationIds.forEach((id) => {
          socket.join(`conversation:${id}`);
        });
        console.log(`👥 [ROOMS] Socket ${socketId} bulk-subscribed to ${conversationIds.length} channels.`);
      }
    });

    // 3. Realtime message delivery
    socket.on("message:send", ({ conversationId, message }) => {
      if (!conversationId || !message) return;
      // Broadcast new message to all participants in the conversation room
      io.to(`conversation:${conversationId}`).emit("message:new", { conversationId, message });
      console.log(`✉️ [MESSAGE] Realtime dispatch in conversation:${conversationId} from ${userId}`);
    });

    // 4. Typing indicators
    socket.on("typing:start", ({ conversationId, userName }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("typing:start", { conversationId, userId, userName });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("typing:stop", { conversationId, userId });
    });

    // 5. Read confirmation seen receipts
    socket.on("message:seen", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("message:seen", { conversationId, userId });
      console.log(`👁️ [SEEN] Read receipts broadcasted in conversation:${conversationId} by ${userId}`);
    });

    // 6. Realtime Study Room Collaborative Events (Polls, Sessions, Pins)
    socket.on("poll:new", ({ conversationId, poll }) => {
      if (!conversationId || !poll) return;
      io.to(`conversation:${conversationId}`).emit("poll:new", { conversationId, poll });
      console.log(`📊 [POLL] New poll created in room:${conversationId}`);
    });

    socket.on("poll:vote", ({ conversationId, pollId, userId: voterId, optionIndex }) => {
      if (!conversationId || !pollId) return;
      io.to(`conversation:${conversationId}`).emit("poll:vote", { conversationId, pollId, userId: voterId, optionIndex });
      console.log(`📊 [POLL] Vote cast in room:${conversationId} for poll:${pollId}`);
    });

    socket.on("session:new", ({ conversationId, session }) => {
      if (!conversationId || !session) return;
      io.to(`conversation:${conversationId}`).emit("session:new", { conversationId, session });
      console.log(`📅 [SESSION] Study session scheduled in room:${conversationId}`);
    });

    socket.on("resource:pin", ({ conversationId, resource }) => {
      if (!conversationId || !resource) return;
      io.to(`conversation:${conversationId}`).emit("resource:pin", { conversationId, resource });
      console.log(`📌 [RESOURCE] New resource pinned in room:${conversationId}`);
    });

    // 7. Centralized Realtime Notifications alerts & unread synchronization
    socket.on("notification:new", ({ targetUserId, notification }) => {
      if (!targetUserId || !notification) return;
      io.to(`user:${targetUserId}:notifications`).emit("notification:new", { notification });
      console.log(`🔔 [NOTIFICATION] Broadcasted realtime notification alert to user: ${targetUserId}`);
    });

    socket.on("notification:unread_count", ({ targetUserId, unreadCount }) => {
      if (!targetUserId) return;
      io.to(`user:${targetUserId}:notifications`).emit("notification:unread_count", { unreadCount });
      console.log(`🔔 [NOTIFICATION] Synced unreadCount: ${unreadCount} to user: ${targetUserId}`);
    });

    // 8. Socket disconnect cleanup
    socket.on("disconnect", () => {
      console.log(`🔌 [SOCKET] Client disconnected: ${socketId} (User: ${userId})`);
      
      const uId = socketToUser.get(socketId);
      socketToUser.delete(socketId);

      if (uId && onlineUsers.has(uId)) {
        const sockets = onlineUsers.get(uId)!;
        sockets.delete(socketId);
        
        // If no active socket sessions remain, user is offline
        if (sockets.size === 0) {
          onlineUsers.delete(uId);
          const lastSeen = new Date();
          console.log(`⚫ [PRESENCE] User ${uId} is now OFFLINE. Last seen ${lastSeen.toISOString()}`);
          io.emit("user:offline", { userId: uId, lastSeen });
        }
      }
    });
  });

  res.socket.server.io = io;
  res.end();
};

export default ioHandler;
