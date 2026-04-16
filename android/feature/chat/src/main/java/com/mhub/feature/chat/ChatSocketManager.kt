package com.mhub.feature.chat

import com.mhub.core.common.result.Result
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Named

@Serializable
data class ChatMessage(
    val id: Int = 0,
    val conversationId: Int = 0,
    val senderId: Int = 0,
    val content: String = "",
    val type: String = "text",
    val createdAt: String = "",
    val senderName: String? = null,
    val senderAvatar: String? = null,
)

@Serializable
data class Conversation(
    val id: Int = 0,
    val otherUserId: Int = 0,
    val otherUserName: String = "",
    val otherUserAvatar: String? = null,
    val lastMessage: String? = null,
    val lastMessageAt: String? = null,
    val unreadCount: Int = 0,
    val postId: Int? = null,
    val postTitle: String? = null,
)

class ChatSocketManager @Inject constructor(
    @Named("ws_base_url") private val wsBaseUrl: String,
) {
    private var socket: Socket? = null

    fun connect(token: String) {
        try {
            val options = IO.Options.builder()
                .setAuth(mapOf("token" to token))
                .setTransports(arrayOf("websocket"))
                .setReconnection(true)
                .setReconnectionAttempts(5)
                .setReconnectionDelay(1000)
                .build()

            socket = IO.socket(wsBaseUrl, options).apply {
                on(Socket.EVENT_CONNECT) {
                    Timber.d("Chat socket connected")
                }
                on(Socket.EVENT_DISCONNECT) {
                    Timber.d("Chat socket disconnected")
                }
                on(Socket.EVENT_CONNECT_ERROR) { args ->
                    Timber.e("Chat socket error: ${args.firstOrNull()}")
                }
                connect()
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to connect chat socket")
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket = null
    }

    fun joinConversation(conversationId: Int) {
        socket?.emit("join_conversation", conversationId)
    }

    fun leaveConversation(conversationId: Int) {
        socket?.emit("leave_conversation", conversationId)
    }

    fun sendMessage(conversationId: Int, content: String, type: String = "text") {
        val data = JSONObject().apply {
            put("conversationId", conversationId)
            put("content", content)
            put("type", type)
        }
        socket?.emit("send_message", data)
    }

    fun sendTyping(conversationId: Int, isTyping: Boolean) {
        val data = JSONObject().apply {
            put("conversationId", conversationId)
            put("isTyping", isTyping)
        }
        socket?.emit("typing", data)
    }

    fun observeMessages(): Flow<ChatMessage> = callbackFlow {
        val listener = { args: Array<Any> ->
            try {
                val json = args[0].toString()
                val message = Json.decodeFromString<ChatMessage>(json)
                trySend(message)
            } catch (e: Exception) {
                Timber.e(e, "Failed to parse incoming message")
            }
            Unit
        }
        socket?.on("new_message", listener)
        awaitClose { socket?.off("new_message", listener) }
    }

    fun observeTyping(): Flow<Pair<Int, Boolean>> = callbackFlow {
        val listener = { args: Array<Any> ->
            try {
                val data = JSONObject(args[0].toString())
                trySend(Pair(data.getInt("userId"), data.getBoolean("isTyping")))
            } catch (e: Exception) {
                Timber.e(e, "Failed to parse typing event")
            }
            Unit
        }
        socket?.on("user_typing", listener)
        awaitClose { socket?.off("user_typing", listener) }
    }

    val isConnected: Boolean get() = socket?.connected() == true
}
