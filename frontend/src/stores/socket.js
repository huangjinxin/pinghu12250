import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io } from 'socket.io-client'
import { useAuthStore } from './auth'

const MAX_MESSAGES_TOTAL = 400
const MAX_MESSAGES_PER_CONVERSATION = 120

export const useSocketStore = defineStore('socket', () => {
  const socket = ref(null)
  const connected = ref(false)
  const onlineUsers = ref(new Set())
  const messages = ref([])
  const unreadCount = ref(0)

  const authStore = useAuthStore()

  function getMessageKey(message) {
    if (message.id) return `id:${message.id}`
    if (message.tempId) return `temp:${message.tempId}`
    return `${message.fromUserId || ''}:${message.toUserId || ''}:${message.createdAt || ''}:${message.content || ''}`
  }

  function getConversationKey(message) {
    const currentUserId = authStore.user?.id
    if (!currentUserId) return message.fromUserId || message.toUserId || 'unknown'
    return message.fromUserId === currentUserId ? message.toUserId : message.fromUserId
  }

  function shouldAlwaysKeep(message) {
    return Boolean(message.pending || message.pendingReply || message.error)
      || String(message.id || '').startsWith('rest_')
      || String(message.tempId || '').startsWith('temp_')
  }

  function updateUnreadCount() {
    unreadCount.value = messages.value.filter(m => !m.isRead && m.toUserId === authStore.user?.id).length
  }

  function trimMessages(list) {
    const seen = new Set()
    const conversationCounts = new Map()
    const kept = []

    for (let i = list.length - 1; i >= 0; i -= 1) {
      const message = list[i]
      const messageKey = getMessageKey(message)
      if (seen.has(messageKey)) continue
      seen.add(messageKey)

      const conversationKey = getConversationKey(message)
      const conversationCount = conversationCounts.get(conversationKey) || 0
      const canKeep = shouldAlwaysKeep(message)
        || (conversationCount < MAX_MESSAGES_PER_CONVERSATION && kept.length < MAX_MESSAGES_TOTAL)

      if (!canKeep) continue

      conversationCounts.set(conversationKey, conversationCount + 1)
      kept.push(message)
    }

    return kept.reverse()
  }

  function setMessageList(list) {
    messages.value = trimMessages(list)
    updateUnreadCount()
  }

  function mergeMessages(list) {
    if (!Array.isArray(list) || list.length === 0) return
    setMessageList([...messages.value, ...list])
  }

  function upsertMessage(nextMessage, matcher = null) {
    const nextMessages = [...messages.value]
    const index = matcher
      ? nextMessages.findIndex(matcher)
      : nextMessages.findIndex(message => {
          if (nextMessage.id && message.id === nextMessage.id) return true
          if (nextMessage.tempId && message.tempId === nextMessage.tempId) return true
          return false
        })

    if (index === -1) {
      nextMessages.push(nextMessage)
    } else {
      nextMessages[index] = nextMessage
    }

    setMessageList(nextMessages)
  }

  function removeMessages(predicate) {
    setMessageList(messages.value.filter(message => !predicate(message)))
  }

  function connect() {
    if (socket.value?.connected) return

    const token = authStore.token
    if (!token) return

    socket.value = io(window.location.origin, {
      path: '/socket.io',
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 2,
      timeout: 15000,
    })

    socket.value.on('connect', () => {
      connected.value = true
      console.log('[Socket] 已连接')
      syncMessages()
    })

    socket.value.on('disconnect', () => {
      connected.value = false
      console.log('[Socket] 已断开')
    })

    socket.value.on('new_message', (message) => {
      const replyTime = message.createdAt ? new Date(message.createdAt).getTime() : Date.now()
      removeMessages(m => m.pendingReply && m.fromUserId === message.fromUserId && (!m.pendingReplyFor || m.pendingReplyFor < replyTime))
      upsertMessage(message)
    })

    socket.value.on('message_sent', ({ tempId, message }) => {
      upsertMessage(message, m => m.tempId === tempId)
    })

    socket.value.on('message_error', ({ tempId, error }) => {
      console.error('[Socket] 消息发送失败:', error)
      const index = messages.value.findIndex(m => m.tempId === tempId)
      if (index === -1) return
      const nextMessages = [...messages.value]
      nextMessages[index] = {
        ...nextMessages[index],
        error,
      }
      setMessageList(nextMessages)
    })

    socket.value.on('user_online', ({ userId }) => {
      onlineUsers.value.add(userId)
    })

    socket.value.on('user_offline', ({ userId }) => {
      onlineUsers.value.delete(userId)
    })

    socket.value.on('sync_result', ({ messages: syncedMessages }) => {
      mergeMessages(syncedMessages)
    })
  }

  function disconnect() {
    socket.value?.disconnect()
    socket.value = null
    connected.value = false
  }

  function sendMessage(toUserId, content) {
    const tempId = `temp_${Date.now()}_${Math.random()}`
    const tempMessage = {
      tempId,
      fromUserId: authStore.user.id,
      toUserId,
      content,
      createdAt: new Date().toISOString(),
      fromUser: {
        id: authStore.user.id,
        username: authStore.user.username,
        avatar: authStore.user.avatar
      }
    }
    mergeMessages([tempMessage])
    socket.value?.emit('send_message', { toUserId, content, tempId })
  }

  function markRead(messageIds) {
    socket.value?.emit('mark_read', { messageIds })
    messageIds.forEach(id => {
      const message = messages.value.find(m => m.id === id)
      if (message) message.isRead = true
    })
    updateUnreadCount()
  }

  function syncMessages() {
    const lastMessageId = messages.value.length > 0
      ? messages.value[messages.value.length - 1].id
      : '0'
    socket.value?.emit('sync_messages', { lastMessageId })
  }

  const getConversation = computed(() => (userId) => {
    return messages.value.filter(message => (
      (message.fromUserId === userId && message.toUserId === authStore.user.id)
      || (message.fromUserId === authStore.user.id && message.toUserId === userId)
    )).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  })

  return {
    socket,
    connected,
    onlineUsers,
    messages,
    unreadCount,
    connect,
    disconnect,
    sendMessage,
    markRead,
    syncMessages,
    getConversation,
    setMessageList,
    mergeMessages,
    upsertMessage,
    removeMessages,
  }
})
