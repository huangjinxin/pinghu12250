import { ref } from 'vue'
import { useSocketStore } from '@/stores/socket'
import { useAuthStore } from '@/stores/auth'

let pendingJoin = null

export function useTypingSocket() {
  const socketStore = useSocketStore()
  const authStore = useAuthStore()

  const leaderboard = ref([])
  const myRank = ref(null)
  const prevRank = ref(null)
  const overtakeBanner = ref(null)
  const chaseInfo = ref(null)
  const connected = ref(false)

  function ensureConnected() {
    if (!socketStore.socket?.connected) {
      if (authStore.token) {
        socketStore.connect()
      }
    }
    return socketStore.socket
  }

  function tryEmitJoin() {
    const sock = socketStore.socket
    if (sock?.connected && pendingJoin) {
      sock.emit('join_typist', {
        user_id: pendingJoin.id,
        username: pendingJoin.profile?.nickname || pendingJoin.username || '访客',
      })
      pendingJoin = null
    }
  }

  function joinGame(user) {
    pendingJoin = user
    const sock = ensureConnected()
    if (!sock) {
      console.warn('[TypingSocket] Socket未连接，缓存加入请求')
      return
    }
    if (sock?.connected) {
      tryEmitJoin()
    } else {
      sock.once('connect', tryEmitJoin)
    }
  }

  function updateScore(score, wpm) {
    const sock = socketStore.socket
    if (!sock?.connected) return
    sock.emit('update_score', { score, wpm })
  }

  function leaveGame() {
    const sock = socketStore.socket
    if (!sock?.connected) return
    sock.emit('leave_typist')
  }

  function listenOnLeaderboardUpdate() {
    const sock = socketStore.socket
    if (!sock) return
    sock.on('leaderboard_update', (data) => {
      const sorted = [...data].sort((a, b) => b.score - a.score)
      leaderboard.value = sorted.map((item, i) => ({
        ...item,
        rank: i + 1,
      }))
    })
  }

  function unlistenOnLeaderboardUpdate() {
    const sock = socketStore.socket
    if (!sock) return
    sock.off('leaderboard_update')
  }

  function resetScore() {
    const sock = socketStore.socket
    if (!sock?.connected) return
    sock.emit('reset_score')
  }

  function updateChase(myId) {
    if (!myId || leaderboard.value.length === 0) return
    const sorted = [...leaderboard.value].sort((a, b) => b.score - a.score)
    const me = sorted.find(p => String(p.userId) === String(myId))
    if (!me) return

    const currentRank = me.rank
    if (prevRank.value !== null && prevRank.value > currentRank) {
      const overtaken = prevRank.value - currentRank
      overtakeBanner.value = {
        text: `↑${overtaken}名`,
        id: Date.now(),
      }
      setTimeout(() => {
        if (overtakeBanner.value?.id === overtakeBanner.value.id) {
          overtakeBanner.value = null
        }
      }, 2000)
    }
    prevRank.value = currentRank
    myRank.value = currentRank

    const myIdx = sorted.findIndex(p => String(p.userId) === String(myId))
    if (myIdx > 0) {
      const above = sorted[myIdx - 1]
      chaseInfo.value = {
        name: above.username,
        gap: above.score - me.score,
      }
    } else {
      chaseInfo.value = null
    }
  }

  function resetState() {
    leaderboard.value = []
    myRank.value = null
    prevRank.value = null
    overtakeBanner.value = null
    chaseInfo.value = null
  }

  return {
    leaderboard,
    myRank,
    chaseInfo,
    overtakeBanner,
    joinGame,
    updateScore,
    leaveGame,
    resetScore,
    listenOnLeaderboardUpdate,
    unlistenOnLeaderboardUpdate,
    updateChase,
    resetState,
  }
}
