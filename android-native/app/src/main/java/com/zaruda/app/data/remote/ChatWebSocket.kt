package com.zaruda.app.data.remote

import android.util.Log
import com.zaruda.app.data.local.AppPreferences
import com.zaruda.app.data.local.TokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class WsMessage(
    val type: String,
    val conversationId: String? = null,
    val messageId: String? = null,
    val senderId: String? = null,
    val content: String? = null,
    val timestamp: String? = null,
)

sealed class ChatEvent {
    data class NewMessage(val conversationId: String, val senderId: String, val content: String, val messageId: String, val timestamp: String) : ChatEvent()
    data class TypingStarted(val conversationId: String, val userId: String) : ChatEvent()
    data class TypingStopped(val conversationId: String, val userId: String) : ChatEvent()
    data class MessageRead(val conversationId: String, val messageId: String) : ChatEvent()
    data class UserOnline(val userId: String) : ChatEvent()
    data class UserOffline(val userId: String) : ChatEvent()
}

@Singleton
class ChatWebSocket @Inject constructor(
    private val okHttpClient: OkHttpClient,
    private val tokenStore: TokenStore,
    private val appPreferences: AppPreferences,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val json = Json { ignoreUnknownKeys = true }

    private var webSocket: WebSocket? = null
    private var reconnectAttempt = 0
    private val maxReconnect = 5

    private val _events = MutableSharedFlow<ChatEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<ChatEvent> = _events.asSharedFlow()

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    fun connect() {
        if (webSocket != null) return
        val token = tokenStore.accessToken.value ?: return
        val baseUrl = runBlocking { appPreferences.baseUrl.first() }.replace("http", "ws").trimEnd('/')
        val wsUrl = "$baseUrl/ws/chat?token=$token"

        val request = Request.Builder().url(wsUrl).build()
        webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _connected.value = true
                reconnectAttempt = 0
                Log.d("ChatWS", "Connected")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val msg = json.decodeFromString<WsMessage>(text)
                    val event = when (msg.type) {
                        "new_message" -> ChatEvent.NewMessage(
                            conversationId = msg.conversationId.orEmpty(),
                            senderId = msg.senderId.orEmpty(),
                            content = msg.content.orEmpty(),
                            messageId = msg.messageId.orEmpty(),
                            timestamp = msg.timestamp.orEmpty(),
                        )
                        "typing_start" -> ChatEvent.TypingStarted(msg.conversationId.orEmpty(), msg.senderId.orEmpty())
                        "typing_stop" -> ChatEvent.TypingStopped(msg.conversationId.orEmpty(), msg.senderId.orEmpty())
                        "message_read" -> ChatEvent.MessageRead(msg.conversationId.orEmpty(), msg.messageId.orEmpty())
                        "user_online" -> ChatEvent.UserOnline(msg.senderId.orEmpty())
                        "user_offline" -> ChatEvent.UserOffline(msg.senderId.orEmpty())
                        else -> null
                    }
                    event?.let { scope.launch { _events.emit(it) } }
                } catch (e: Exception) {
                    Log.w("ChatWS", "Parse error: ${e.message}")
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
                _connected.value = false
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                _connected.value = false
                Log.w("ChatWS", "Connection failed: ${t.message}")
                scheduleReconnect()
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                _connected.value = false
                if (code != 1000) scheduleReconnect()
            }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, "User disconnect")
        webSocket = null
        _connected.value = false
    }

    fun sendTyping(conversationId: String) {
        send("""{"type":"typing_start","conversationId":"$conversationId"}""")
    }

    fun sendStopTyping(conversationId: String) {
        send("""{"type":"typing_stop","conversationId":"$conversationId"}""")
    }

    fun markRead(conversationId: String, messageId: String) {
        send("""{"type":"mark_read","conversationId":"$conversationId","messageId":"$messageId"}""")
    }

    private fun send(text: String) {
        webSocket?.send(text)
    }

    private fun scheduleReconnect() {
        if (reconnectAttempt >= maxReconnect) return
        reconnectAttempt++
        scope.launch {
            delay(reconnectAttempt * 2000L)
            webSocket = null
            connect()
        }
    }
}
