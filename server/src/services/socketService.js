/**
 * Socket Service - The Defender's Real-Time Nervous System
 * Authenticated WebSocket manager for instant messaging and notifications
 */
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
const userSocketMap = new Map(); // Maps UserId -> SocketId

/**
 * Initialize the Socket Layer
 * @param {http.Server} server - HTTP server instance
 */
const init = (server) => {
    io = socketIo(server, {
        cors: {
            origin: process.env.CLIENT_URL || [
                "http://localhost:5173",
                "http://localhost:3000"
            ],
            methods: ["GET", "POST"],
            credentials: true
        },
        pingTimeout: 60000, // Connection healing
        pingInterval: 25000
    });

    // Middleware: Zero Trust Authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            console.log('[DEFENDER] Socket rejected: No token');
            return next(new Error("Authentication required"));
        }

        jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key', (err, decoded) => {
            if (err) {
                console.log('[DEFENDER] Socket rejected: Invalid token');
                return next(new Error("Invalid authentication"));
            }
            socket.user = decoded;
            next();
        });
    });

    io.on('connection', (socket) => {
        const userId = socket.user.userId || socket.user.id;
        console.log(`[DEFENDER] ✅ User Connected: ${userId}`);

        // Map User ID to Socket ID for direct targeting
        userSocketMap.set(userId, socket.id);

        // Join personal room for private notifications
        socket.join(`user_${userId}`);

        // Event: Join product room (for live bidding/watching)
        socket.on('join_product_room', (postId) => {
            socket.join(`post_${postId}`);
            console.log(`[DEFENDER] User ${userId} joined post_${postId}`);
        });

        // Event: Leave product room
        socket.on('leave_product_room', (postId) => {
            socket.leave(`post_${postId}`);
        });

        // Event: Instant Message / Negotiation
        socket.on('send_message', async (data) => {
            // data = { toUserId, message, postId, type }
            const messageData = {
                ...data,
                fromUserId: userId,
                timestamp: new Date().toISOString()
            };

            // Send to specific recipient if online
            const recipientSocketId = userSocketMap.get(data.toUserId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('receive_message', messageData);
            }

            // Also emit to user's own room for multi-device sync
            socket.emit('message_sent', messageData);

            // Persist to DB handled by controller (emit event for it)
            io.emit('persist_message', messageData);
        });

        // Event: Typing indicator
        socket.on('typing', (data) => {
            const recipientSocketId = userSocketMap.get(data.toUserId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('user_typing', {
                    userId,
                    postId: data.postId
                });
            }
        });

        // Event: Offer made (for real-time price negotiation)
        socket.on('make_offer', (data) => {
            // Notify seller
            const sellerSocketId = userSocketMap.get(data.sellerId);
            if (sellerSocketId) {
                io.to(sellerSocketId).emit('new_offer', {
                    ...data,
                    fromUserId: userId,
                    timestamp: new Date().toISOString()
                });
            }
            // Notify all watchers in the post room
            io.to(`post_${data.postId}`).emit('offer_activity', {
                postId: data.postId,
                offerCount: data.offerCount || 1
            });
        });

        socket.on('disconnect', () => {
            userSocketMap.delete(userId);
            console.log(`[DEFENDER] ❌ User Disconnected: ${userId}`);
        });

        socket.on('error', (err) => {
            console.error(`[DEFENDER] Socket error for user ${userId}:`, err.message);
        });
    });

    console.log('[DEFENDER] 🚀 Real-Time Socket Layer initialized');
};

/**
 * Get Socket.io instance for controllers to emit events
 */
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

/**
 * Send notification to specific user
 * @param {number} userId - Target user ID
 * @param {object} notification - Notification payload
 */
const notifyUser = (userId, notification) => {
    const socketId = userSocketMap.get(userId);
    if (socketId) {
        io.to(socketId).emit('notification', {
            ...notification,
            timestamp: new Date().toISOString()
        });
        return true;
    }
    return false; // User offline, will see in DB notifications
};

/**
 * Broadcast to all users watching a post
 * @param {number} postId - Post ID
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
const broadcastToPost = (postId, event, data) => {
    io.to(`post_${postId}`).emit(event, data);
};

/**
 * Get online user count
 */
const getOnlineCount = () => userSocketMap.size;

/**
 * Check if user is online
 */
const isUserOnline = (userId) => userSocketMap.has(userId);

module.exports = {
    init,
    getIO,
    notifyUser,
    broadcastToPost,
    getOnlineCount,
    isUserOnline
};
