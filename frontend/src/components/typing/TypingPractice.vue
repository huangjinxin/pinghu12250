<template>
  <div class="typing-practice-overlay">
    <!-- 隐藏输入框捕获键盘 -->
    <input
      ref="hiddenInput"
      class="hidden-input"
      type="text"
      autocapitalize="off"
      autocomplete="off"
      autocorrect="off"
      @keydown="handleKeyDown"
    />

    <!-- 星空背景 -->
    <div class="stars-container">
      <div class="star-layer layer-1"></div>
      <div class="star-layer layer-2"></div>
    </div>

    <!-- 顶部状态栏 -->
    <div class="game-header">
      <div class="header-left">
        <button class="exit-btn" @click="handleExit">← 退出</button>
        <button class="mute-btn" :class="{ muted }" @click="toggleMute">
          {{ muted ? '🔇' : '🔊' }}
        </button>
      </div>
      <div class="stat-group">
        <div class="stat-item">
          <div class="stat-label">SCORE</div>
          <div class="stat-value">{{ score.toString().padStart(6, '0') }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">ACCURACY</div>
          <div class="stat-value">{{ accuracyDisplay }}%</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">SPEED</div>
          <div class="stat-value">{{ currentWpm }} WPM</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">COMBO</div>
          <div class="stat-value" :class="{ 'combo-hot': combo >= 10 }">x{{ combo }}</div>
        </div>
      </div>
      <div class="shields">
        <span v-for="i in shields" :key="i">🛡️</span>
        <span v-for="i in (3 - shields)" :key="'empty-' + i" style="opacity: 0.2;">🛡️</span>
      </div>
    </div>

    <!-- 游戏区域 -->
    <div ref="gameArea" class="game-area" @click="focusInput">
      <!-- 敌人 -->
      <div
        v-for="enemy in enemies"
        :key="enemy.id"
        class="enemy"
        :class="{ locked: enemy === lockedEnemy }"
        :style="{ left: enemy.x + 'px', transform: 'translateY(' + enemy.y + 'px)' }"
      >
        <div class="enemy-svg" :style="{ color: enemy.color }" v-html="enemy.svg"></div>
        <div class="enemy-word">
          <span class="typed">{{ enemy.typed }}</span><span class="remaining">{{ enemy.word.slice(enemy.typed.length) }}</span>
        </div>
      </div>

      <!-- 开始界面 -->
      <div v-if="gameState === 'idle'" class="ui-overlay" @click.stop>
        <div class="menu-card">
          <h1 class="menu-title">星际字航员</h1>
          <p class="menu-sub">敲击字母，消灭敌人</p>
          <div class="task-threshold-hint">
            今日任务标准：得分达到 <span class="threshold-value">{{ personalBestScore }}</span>
          </div>
          <button class="btn-start" @click="startGame">准备起飞</button>
        </div>
      </div>

      <!-- 暂停界面 -->
      <div v-if="gameState === 'paused'" class="ui-overlay" @click.stop>
        <div class="menu-card">
          <h1 class="menu-title" style="font-size: 36px;">已暂停</h1>
          <button class="btn-start" @click="resumeGame">继续</button>
        </div>
      </div>

      <!-- 结束界面 -->
      <div v-if="gameState === 'over'" class="ui-overlay" @click.stop>
        <div class="menu-card" style="width: 420px;">
          <h1 class="menu-title" style="color: #ff2d55;">任务终止</h1>
          <div class="final-stats">
            <div class="final-stat">
              <div class="final-value">{{ score }}</div>
              <div class="final-label">得分</div>
            </div>
            <div class="final-stat">
              <div class="final-value">{{ accuracyDisplay }}%</div>
              <div class="final-label">准确率</div>
            </div>
            <div class="final-stat">
              <div class="final-value">{{ maxWpm }} WPM</div>
              <div class="final-label">最高速度</div>
            </div>
            <div class="final-stat">
              <div class="final-value">{{ maxCombo }}</div>
              <div class="final-label">最大连击</div>
            </div>
          </div>
          <div class="final-actions">
            <button class="btn-start" :disabled="submitting" @click="submitAndClose">
              {{ submitting ? '保存中...' : '保存并退出' }}
            </button>
            <button class="btn-restart" @click="restartGame">再来一局</button>
          </div>
        </div>
      </div>

      <!-- 粒子特效 -->
      <div
        v-for="p in particles"
        :key="p.id"
        class="particle"
        :style="{
          left: p.x + 'px',
          top: p.y + 'px',
          background: p.color,
          opacity: p.life,
          transform: `scale(${p.life})`
        }"
      />

      <!-- 烟花特效 -->
      <div
        v-for="f in fireworks"
        :key="f.id"
        class="firework"
        :style="{
          left: f.x + 'px',
          top: f.y + 'px',
          color: f.color
        }"
      />

      <!-- 巨大连击成语提示 -->
      <div
        v-if="showGiantCombo"
        class="giant-combo"
        :style="{ color: giantComboColor }"
      >
        {{ giantComboText }}
      </div>

      <!-- 左下角连击数字 -->
      <div
        class="combo-text"
        :class="{ 'combo-hot': combo >= 10 }"
      >
        X {{ combo }}
      </div>

      <!-- 超越横幅 -->
      <div
        v-if="overtakeBanner"
        :key="overtakeBanner.id"
        class="overtake-banner"
      >
        {{ overtakeBanner.text }}
      </div>

      <!-- 追逐HUD -->
      <div v-if="chaseInfo && liveMyRank !== null && liveMyRank > 1" class="chase-hud">
        <div class="chase-label">追逐目标</div>
        <div class="chase-name">{{ chaseInfo.name }}</div>
        <div class="chase-gap">差距 {{ chaseInfo.gap }} 分</div>
      </div>
    </div>

    <!-- 实时排行榜侧边栏 -->
    <div v-if="myUserId" class="live-leaderboard">
      <div class="lb-header">
        <span class="lb-title">实时排名</span>
        <span class="lb-online">{{ liveLeaderboard.length }}人在线</span>
      </div>
      <div v-if="liveLeaderboard.length > 0" class="lb-list">
        <div
          v-for="p in liveLeaderboard.slice(0, 10)"
          :key="p.userId"
          class="lb-item"
          :class="{ 'is-me': String(p.userId) === String(myUserId) }"
        >
          <div class="lb-rank" :class="{ gold: p.rank === 1, silver: p.rank === 2, bronze: p.rank === 3 }">
            {{ p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : p.rank }}
          </div>
          <div class="lb-name">{{ p.username }}</div>
          <div class="lb-score">{{ p.score }}</div>
        </div>
      </div>
      <div v-else class="lb-empty">等待其他玩家加入...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { typingAPI } from '@/api/index'
import { useTypingAudio } from '@/composables/useTypingAudio'
import { useSpaceBGM } from '@/composables/useSpaceBGM'
import { useTypingSocket } from '@/composables/useTypingSocket'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  difficulty: { type: Number, default: 1.0 },
})

const emit = defineEmits(['close', 'complete'])
const message = useMessage()
const authStore = useAuthStore()

const { muted, toggleMute, playKey, playExplosion, playHeavyExplosion, playFirework, playGameOver, getRandomIdiom, getRandomColor } = useTypingAudio()
const { muted: bgmMuted, toggleMute: toggleBgmMute, start: startBGM, stop: stopBGM } = useSpaceBGM()
const {
  leaderboard: liveLeaderboard,
  myRank: liveMyRank,
  chaseInfo,
  overtakeBanner,
  joinGame,
  updateScore: emitScore,
  leaveGame,
  listenOnLeaderboardUpdate,
  unlistenOnLeaderboardUpdate,
  updateChase,
  resetState,
} = useTypingSocket()

const myUserId = computed(() => authStore.user?.id)

// 词库
const dictionary = [
  'space', 'rocket', 'pilot', 'galaxy', 'star', 'laser', 'orbit', 'void', 'cyber', 'core',
  'apple', 'hero', 'jump', 'speed', 'power', 'magic', 'dream', 'world', 'light', 'dark',
  'pingyin', 'xuexi', 'kuaile', 'dazi', 'gaoshou', 'jiluo', 'feichuan', 'zhandou',
  'ba', 'bo', 'bi', 'bu', 'bai', 'bei', 'bao', 'ban', 'ben', 'bang', 'beng',
  'pa', 'po', 'pi', 'pu', 'pai', 'pei', 'pao', 'pan', 'pen', 'pang', 'peng',
  'ma', 'mo', 'mi', 'mu', 'mai', 'mei', 'man', 'men', 'mang', 'meng',
  'fa', 'fo', 'fu', 'fei', 'fan', 'fen', 'fang', 'feng',
  'da', 'de', 'di', 'du', 'dao', 'dou', 'dai', 'dan', 'dang', 'deng',
  'ta', 'te', 'ti', 'tu', 'tai', 'tou', 'tan', 'tang', 'teng',
  'na', 'ne', 'ni', 'nu', 'nai', 'nan', 'nang', 'neng',
  'la', 'le', 'li', 'lu', 'lai', 'lei', 'lan', 'leng',
  'ga', 'ge', 'gu', 'gai', 'gan', 'gen', 'gang', 'geng',
  'ka', 'ke', 'ku', 'kai', 'kan', 'ken', 'kang', 'kong',
  'ha', 'he', 'hu', 'hai', 'han', 'hen', 'hang', 'heng',
  'zha', 'zhe', 'zhi', 'zhu', 'zhao', 'zhou', 'zhan', 'zhen', 'zhang', 'zheng',
  'cha', 'che', 'chi', 'chu', 'chan', 'chen', 'chang', 'cheng',
  'sha', 'she', 'shi', 'shu', 'shan', 'shen', 'shang', 'sheng',
  'ya', 'ye', 'yi', 'yu', 'yao', 'you', 'yan', 'yin', 'yang', 'ying',
  'wa', 'wo', 'wu', 'wai', 'wei', 'wan', 'wen', 'wang', 'weng',
]

const enemySvgs = [
  '<svg viewBox="0 0 60 60" width="50" height="50"><polygon points="30,5 55,50 5,50" fill="currentColor" opacity="0.8"/></svg>',
  '<svg viewBox="0 0 60 60" width="50" height="50"><rect x="10" y="10" width="40" height="40" rx="6" fill="currentColor" opacity="0.8"/></svg>',
  '<svg viewBox="0 0 60 60" width="50" height="50"><circle cx="30" cy="30" r="25" fill="currentColor" opacity="0.8"/></svg>',
]

const colors = ['#00f2ff', '#ff2d55', '#00ff88', '#fff', '#ff9f00', '#bf00ff']

// 游戏状态
const gameState = ref('idle') // idle | running | paused | over
const hiddenInput = ref(null)
const gameArea = ref(null)
const submitting = ref(false)

// 视觉特效
const showGiantCombo = ref(false)
const giantComboText = ref('')
const giantComboColor = ref('#00f2ff')
const particles = ref([])
const fireworks = ref([])
const isFrenzy = ref(false)

// 游戏数据
const score = ref(0)
const combo = ref(0)
const maxCombo = ref(0)
const totalChars = ref(0)
const correctChars = ref(0)
const shields = ref(3)
const enemies = ref([])
const lockedEnemy = ref(null)
const startTime = ref(null)
const maxWpm = ref(0)
const personalBestScore = ref(2500)

let enemyIdCounter = 0
let errorKeys = {}
let triggeredIdioms = []
let lastErrorCombo = 0  // 记录犯错时的连击数，用于计算纠错连击
let recoveryCombo = 0   // 犯错后的连续正确次数
let wordsDestroyedCount = 0  // 消灭单词计数
let triggeredScores = {}  // 记录已触发的得分阈值
let gameLoopId = null
let spawnTimerId = null
let scoreUpdateTimerId = null
let areaWidth = 800
let areaHeight = 600

const GAME_SIDE_PADDING = 24
const ENEMY_SAFE_BUFFER = 32

const difficultyFactor = computed(() => props.difficulty)

const accuracyDisplay = computed(() => {
  if (!totalChars.value) return 100
  return Math.round((correctChars.value / totalChars.value) * 100)
})

const currentWpm = computed(() => {
  if (!startTime.value || !correctChars.value) return 0
  const elapsed = (Date.now() - startTime.value) / 60000
  if (elapsed < 0.01) return 0
  return Math.round((correctChars.value / 5) / elapsed)
})

function getLeaderboardReservedWidth() {
  return window.innerWidth <= 768 && myUserId.value ? 170 : myUserId.value ? 180 : 0
}

function estimateEnemyWidth(word) {
  return Math.max(96, word.length * 18 + 48)
}

function getEnemyMaxX(word) {
  const reservedWidth = getLeaderboardReservedWidth()
  const enemyWidth = estimateEnemyWidth(word)
  const maxX = areaWidth - reservedWidth - ENEMY_SAFE_BUFFER - enemyWidth
  return Math.max(GAME_SIDE_PADDING, maxX)
}

function clampEnemyX(enemy) {
  const maxX = getEnemyMaxX(enemy.word)
  enemy.x = Math.min(Math.max(enemy.x, GAME_SIDE_PADDING), maxX)
}

function clampAllEnemies() {
  for (const enemy of enemies.value) {
    clampEnemyX(enemy)
  }
}

function updateGameBounds() {
  if (!gameArea.value) return
  areaWidth = gameArea.value.clientWidth
  areaHeight = gameArea.value.clientHeight
  clampAllEnemies()
}

function focusInput() {
  hiddenInput.value?.focus()
}

function getAvailableWords() {
  if (difficultyFactor.value <= 0.5) {
    return dictionary.filter(w => w.length <= 2)
  }
  return dictionary
}

function spawnEnemy() {
  if (gameState.value !== 'running') return

  const maxEnemies = difficultyFactor.value <= 0.5 ? 3 : difficultyFactor.value <= 1.0 ? 4 : 5
  if (enemies.value.length >= maxEnemies) {
    scheduleSpawn()
    return
  }

  const words = getAvailableWords()
  const word = words[Math.floor(Math.random() * words.length)]
  const color = colors[Math.floor(Math.random() * colors.length)]
  const svg = enemySvgs[Math.floor(Math.random() * enemySvgs.length)]

  enemies.value.push({
    id: ++enemyIdCounter,
    word,
    typed: '',
    x: 0,
    y: -60,
    color,
    svg,
    speed: (0.3 + Math.random() * 0.5) * difficultyFactor.value,
  })

  const enemy = enemies.value[enemies.value.length - 1]
  enemy.x = GAME_SIDE_PADDING + Math.random() * Math.max(0, getEnemyMaxX(word) - GAME_SIDE_PADDING)

  scheduleSpawn()
}

function scheduleSpawn() {
  const delay = Math.max(600, (2000 - Math.floor(score.value / 200) * 100) / difficultyFactor.value)
  spawnTimerId = setTimeout(spawnEnemy, delay)
}

function gameLoop() {
  if (gameState.value !== 'running') return

  const baseVelocity = (0.8 + (score.value / 5000)) * difficultyFactor.value

  for (const en of enemies.value) {
    const s = baseVelocity / Math.max(1, en.word.length / 3)
    en.y += s + en.speed
  }

  // 检查是否有敌人到达底部
  const escaped = enemies.value.filter(en => en.y > areaHeight)
  if (escaped.length > 0) {
    for (const en of escaped) {
      shields.value = Math.max(0, shields.value - 1)
      if (lockedEnemy.value === en) lockedEnemy.value = null
    }
    enemies.value = enemies.value.filter(en => en.y <= areaHeight)

    if (shields.value <= 0) {
      gameOver()
      return
    }
  }

  // 更新 WPM 追踪
  if (currentWpm.value > maxWpm.value) {
    maxWpm.value = currentWpm.value
  }

  gameLoopId = requestAnimationFrame(gameLoop)
}

function handleKeyDown(e) {
  if (gameState.value !== 'running') return
  if (e.key === 'Escape') {
    pauseGame()
    return
  }
  if (!/^[a-zA-Z]$/.test(e.key) || e.ctrlKey || e.altKey || e.metaKey) return
  e.preventDefault()

  const char = e.key.toLowerCase()
  totalChars.value++

  if (lockedEnemy.value) {
    const expected = lockedEnemy.value.word[lockedEnemy.value.typed.length]?.toLowerCase()
    if (char === expected) {
      recoveryCombo++
      hit(lockedEnemy.value)
    } else {
      errorKeys[char] = (errorKeys[char] || 0) + 1
      lastErrorCombo = combo.value
      combo.value = 0
      recoveryCombo = 0
    }
  } else {
    const match = enemies.value.find(en => en.word[0]?.toLowerCase() === char && en !== lockedEnemy.value)
    if (match) {
      lockedEnemy.value = match
      recoveryCombo++
      hit(match)
    } else {
      errorKeys[char] = (errorKeys[char] || 0) + 1
      lastErrorCombo = combo.value
      combo.value = 0
      recoveryCombo = 0
    }
  }
}

function hit(en) {
  en.typed += en.word[en.typed.length]
  correctChars.value++
  combo.value++
  if (combo.value > maxCombo.value) maxCombo.value = combo.value

  playKey(combo.value)

  // 多维度成语触发检测
  checkIdiomTriggers()

  if (en.typed.length === en.word.length) {
    destroy(en)
  }
}

function checkIdiomTriggers() {
  const state = {
    combo: combo.value,
    wpm: currentWpm.value,
    accuracy: accuracyDisplay.value,
    score: score.value,
    wordsDestroyed: wordsDestroyedCount,
    recoveryCombo: recoveryCombo,
  }

  // 连击类 - 每10/15/20...连击触发
  if (combo.value > 0 && combo.value % 10 === 0) {
    const idiom = getRandomIdiom('连击类', combo.value)
    if (idiom && !triggeredIdioms.includes(idiom.word)) {
      triggerFirework()
      showIdiom(idiom.word)
      triggeredIdioms.push(idiom.word)
    }
  }

  // 速度类 - WPM达标时触发（冷却20秒避免频繁）
  if (currentWpm.value >= 25 && currentWpm.value % 5 === 0) {
    const key = `wpm_${currentWpm.value}`
    if (!triggeredScores[key]) {
      triggeredScores[key] = true
      const idiom = getRandomIdiom('速度类', 0)
      if (idiom) {
        showIdiom(idiom.word)
        triggeredIdioms.push(idiom.word)
      }
    }
  }

  // 纠错类 - 犯错后恢复连击
  if (lastErrorCombo >= 5 && recoveryCombo > 0 && recoveryCombo % 5 === 0) {
    const idiom = getRandomIdiom('纠错类', 0)
    if (idiom && !triggeredIdioms.includes(idiom.word)) {
      showIdiom(idiom.word)
      triggeredIdioms.push(idiom.word)
    }
  }
}

function showIdiom(word) {
  giantComboText.value = word
  giantComboColor.value = getRandomColor()
  showGiantCombo.value = true
  setTimeout(() => { showGiantCombo.value = false }, 1200)
}

function destroy(en) {
  let baseScore = (en.word.length * en.word.length * 5) + combo.value * 5
  if (isFrenzy.value) baseScore *= 2
  score.value += Math.floor(baseScore * difficultyFactor.value)
  wordsDestroyedCount++

  const isBigBoss = en.word.length > 5
  
  // 播放音效
  if (isBigBoss && Math.random() > 0.2) {
    playHeavyExplosion()
    createParticles(en.x + 30, en.y + 30, en.color, 4)
  } else {
    playExplosion()
    createParticles(en.x + 30, en.y + 30, en.color, 2)
  }

  enemies.value = enemies.value.filter(e => e !== en)
  if (lockedEnemy.value === en) lockedEnemy.value = null

  // 逆袭类 - 得分达标触发
  const scoreThresholds = [1500, 2000, 2500, 3000, 4000, 5000, 6500, 8000, 10000, 15000]
  for (const threshold of scoreThresholds) {
    if (score.value >= threshold && !triggeredScores[`score_${threshold}`]) {
      triggeredScores[`score_${threshold}`] = true
      const idiom = getRandomIdiom('逆袭类', 0)
      if (idiom) {
        triggerFirework()
        showIdiom(idiom.word)
        triggeredIdioms.push(idiom.word)
      }
    }
  }

  // 首击类 - 消灭单词数达标触发
  const wordThresholds = [5, 8, 12, 15, 20, 25, 35, 50]
  if (wordThresholds.includes(wordsDestroyedCount)) {
    const idiom = getRandomIdiom('首击类', 0)
    if (idiom && !triggeredIdioms.includes(idiom.word)) {
      showIdiom(idiom.word)
      triggeredIdioms.push(idiom.word)
    }
  }

  // 精准类 - 准确率达标触发（每消灭5个单词检查一次）
  if (wordsDestroyedCount % 5 === 0 && totalChars.value >= 20) {
    const acc = accuracyDisplay.value
    if (acc >= 85) {
      const idiom = getRandomIdiom('精准类', 0)
      if (idiom && !triggeredIdioms.includes(idiom.word)) {
        showIdiom(idiom.word)
        triggeredIdioms.push(idiom.word)
      }
    }
  }

  // 极慢模式下屏幕空了立即补
  if (difficultyFactor.value <= 0.5 && enemies.value.length === 0) {
    setTimeout(spawnEnemy, 100)
  }
}

// 粒子特效
function createParticles(x, y, color, count = 4) {
  for (let i = 0; i < count; i++) {
    const id = Date.now() + Math.random()
    particles.value.push({
      id,
      x,
      y,
      color,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 1
    })
  }
  animateParticles()
}

function animateParticles() {
  if (particles.value.length === 0) return
  
  particles.value = particles.value.filter(p => {
    p.x += p.vx
    p.y += p.vy
    p.life -= 0.05
    return p.life > 0
  })
  
  if (particles.value.length > 0) {
    requestAnimationFrame(animateParticles)
  }
}

// 烟花特效
function triggerFirework() {
  const x = 100 + Math.random() * (areaWidth - 200)
  const y = 100 + Math.random() * (areaHeight - 300)
  const id = Date.now()
  fireworks.value.push({
    id,
    x,
    y,
    color: getRandomColor()
  })
  playFirework()
  setTimeout(() => {
    fireworks.value = fireworks.value.filter(f => f.id !== id)
  }, 600)
}

// 成语提示
function startGame() {
  score.value = 0
  combo.value = 0
  maxCombo.value = 0
  totalChars.value = 0
  correctChars.value = 0
  shields.value = 3
  enemies.value = []
  lockedEnemy.value = null
  maxWpm.value = 0
  enemyIdCounter = 0
  errorKeys = {}
  triggeredIdioms = []
  lastErrorCombo = 0
  recoveryCombo = 0
  wordsDestroyedCount = 0
  triggeredScores = {}
  startTime.value = Date.now()
  gameState.value = 'running'

  // 启动BGM
  startBGM()

  // 实时更新分数
  if (myUserId.value) {
    scoreUpdateTimerId = setInterval(() => {
      if (gameState.value === 'running') {
        emitScore(score.value, currentWpm.value)
        updateChase(myUserId.value)
      }
    }, 2000)
  }

  nextTick(() => {
    updateGameBounds()
    focusInput()
    spawnEnemy()
    spawnEnemy()
    gameLoopId = requestAnimationFrame(gameLoop)
  })
}

function pauseGame() {
  gameState.value = 'paused'
  if (spawnTimerId) clearTimeout(spawnTimerId)
  if (gameLoopId) cancelAnimationFrame(gameLoopId)
}

function resumeGame() {
  gameState.value = 'running'
  nextTick(() => {
    focusInput()
    scheduleSpawn()
    gameLoopId = requestAnimationFrame(gameLoop)
  })
}

function gameOver() {
  gameState.value = 'over'
  stopBGM()
  if (spawnTimerId) clearTimeout(spawnTimerId)
  if (gameLoopId) cancelAnimationFrame(gameLoopId)
  if (scoreUpdateTimerId) clearInterval(scoreUpdateTimerId)
  playGameOver()
  // 最后发送一次分数
  if (myUserId.value) {
    emitScore(score.value, currentWpm.value)
  }
}

function restartGame() {
  startGame()
}

async function submitAndClose() {
  submitting.value = true
  try {
    const duration = Math.round((Date.now() - startTime.value) / 1000)
    const res = await typingAPI.submit({
      mode: 'interstellar',
      title: '星际字航员',
      score: score.value,
      totalKeys: totalChars.value,
      correctKeys: correctChars.value,
      accuracy: totalChars.value ? Math.round((correctChars.value / totalChars.value) * 100 * 10) / 10 : 0,
      duration,
      wordsDestroyed: correctChars.value > 0 ? enemies.value.length : 0,
      maxCombo: maxCombo.value,
      wpm: maxWpm.value,
      extraData: {
        difficulty: difficultyFactor.value,
        shields: shields.value,
        errorKeys,
        triggeredIdioms,
      },
    })
    if (res.success) {
      // 离开实时对战
      if (myUserId.value) {
        leaveGame()
        unlistenOnLeaderboardUpdate()
        resetState()
      }
      emit('complete')
    } else {
      message.error(res.error || '保存失败')
    }
  } catch (error) {
    message.error('保存失败')
  } finally {
    submitting.value = false
  }
}

function handleExit() {
  stopBGM()
  if (gameState.value === 'running') {
    pauseGame()
  }
  // 离开实时对战
  if (myUserId.value) {
    leaveGame()
    unlistenOnLeaderboardUpdate()
    resetState()
  }
  if (gameState.value === 'idle' || (totalChars.value === 0 && score.value === 0)) {
    emit('close')
    return
  }
  // 有数据时先结束游戏让用户选择保存
  gameOver()
}

onMounted(() => {
  nextTick(() => {
    updateGameBounds()
    focusInput()
  })
  window.addEventListener('resize', updateGameBounds)
  loadPersonalBest()
  // 立即加入实时排行榜
  if (myUserId.value) {
    joinGame(authStore.user)
    listenOnLeaderboardUpdate()
  }
})

async function loadPersonalBest() {
  try {
    const res = await typingAPI.getTodayStatus({ timezoneOffset: -new Date().getTimezoneOffset() })
    if (res.success && res.data.threshold) {
      personalBestScore.value = res.data.threshold
    }
  } catch (e) {
    console.error('获取个人标准失败', e)
  }
}

onUnmounted(() => {
  window.removeEventListener('resize', updateGameBounds)
  if (spawnTimerId) clearTimeout(spawnTimerId)
  if (gameLoopId) cancelAnimationFrame(gameLoopId)
  if (scoreUpdateTimerId) clearInterval(scoreUpdateTimerId)
  if (myUserId.value) {
    leaveGame()
    unlistenOnLeaderboardUpdate()
    resetState()
  }
})
</script>

<style scoped>
.typing-practice-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #05070a;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  color: white;
  font-family: 'Inter', -apple-system, sans-serif;
  overflow: hidden;
}

.hidden-input {
  position: fixed;
  top: -100px;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.stars-container {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: 0;
  background: radial-gradient(circle at center, #1a1c2c 0%, #05070a 100%);
}

.star-layer {
  position: absolute;
  top: -100%; left: 0;
  width: 100%; height: 200%;
  opacity: 0.3;
}

.layer-1 {
  background-image: radial-gradient(1px 1px at 20px 30px, #fff, transparent), radial-gradient(1px 1px at 150px 45px, #fff, transparent);
  background-size: 200px 200px;
  animation: parallax 100s linear infinite;
}

.layer-2 {
  background-image: radial-gradient(1.5px 1.5px at 50px 160px, #ddd, transparent), radial-gradient(1.5px 1.5px at 110px 10px, #aaa, transparent);
  background-size: 300px 300px;
  animation: parallax 150s linear infinite;
}

@keyframes parallax {
  from { transform: translateY(0); }
  to { transform: translateY(50%); }
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 200px 12px 24px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(15px);
  border-bottom: 1px solid rgba(0, 242, 255, 0.2);
  z-index: 50;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.exit-btn, .mute-btn {
  background: none;
  border: 1px solid rgba(0, 242, 255, 0.3);
  color: #00f2ff;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.mute-btn.muted {
  color: #555;
  border-color: #333;
}

.stat-group {
  display: flex;
  gap: 32px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 10px;
  letter-spacing: 2px;
  color: #00f2ff;
  opacity: 0.7;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  font-family: monospace;
}

.combo-hot {
  color: #ff2d55;
  text-shadow: 0 0 10px #ff2d55;
}

.shields {
  font-size: 18px;
  display: flex;
  gap: 4px;
}

.game-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  z-index: 10;
  margin-right: 180px;
}

.enemy {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  will-change: transform;
  transition: none;
}

.enemy-svg {
  filter: drop-shadow(0 0 8px currentColor);
}

.enemy.locked .enemy-svg {
  transform: scale(1.15);
  filter: drop-shadow(0 0 16px #ff2d55);
}

.enemy-word {
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 18px;
  margin-top: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: bold;
  font-family: monospace;
}

.enemy-word .typed {
  color: #00f2ff;
  text-shadow: 0 0 10px #00f2ff, 0 0 20px #00f2ff;
}

.enemy-word .remaining {
  color: rgba(255, 255, 255, 0.7);
}

.ui-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(5, 7, 10, 0.9);
  z-index: 100;
}

.menu-card {
  background: #0d1117;
  padding: 48px;
  border-radius: 4px;
  text-align: center;
  border: 1px solid #00f2ff;
  box-shadow: 0 0 50px rgba(0, 242, 255, 0.1);
}

.menu-title {
  font-size: 48px;
  font-weight: 900;
  background: linear-gradient(135deg, #00f2ff, #bf00ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 12px 0;
}

.menu-sub {
  color: #888;
  font-size: 16px;
  margin: 0 0 24px 0;
}

.task-threshold-hint {
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
  background: rgba(0, 242, 255, 0.1);
  padding: 10px 16px;
  border-radius: 6px;
  display: inline-block;
}

.threshold-value {
  color: #ff2d55;
  font-size: 22px;
  font-weight: 900;
  margin-left: 4px;
}

.btn-start {
  background: linear-gradient(135deg, #00f2ff, #00a8ff);
  color: #000;
  border: none;
  padding: 14px 48px;
  font-size: 18px;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 0 30px rgba(0, 242, 255, 0.3);
}

.btn-start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-restart {
  background: none;
  border: 1px solid rgba(0, 242, 255, 0.4);
  color: #00f2ff;
  padding: 14px 48px;
  font-size: 18px;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
}

.final-stats {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin: 24px 0;
}

.final-stat {
  text-align: center;
}

.final-value {
  font-size: 28px;
  font-weight: 800;
  color: #00f2ff;
  font-family: monospace;
}

.final-label {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.final-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 24px;
}

.particle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 15;
  box-shadow: 0 0 10px currentColor;
}

.firework {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 55;
  transform: translate(-50%, -50%) scale(0);
  opacity: 1;
  box-shadow: 0 0 40px 20px currentColor;
  background: currentColor;
  animation: burstAnim 0.6s ease-out forwards;
}

@keyframes burstAnim {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
}

.giant-combo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  font-size: 80px;
  font-weight: 900;
  pointer-events: none;
  z-index: 60;
  animation: popFade 1s ease-out forwards;
  text-shadow: 0 0 30px currentColor;
}

@keyframes popFade {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  30% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}

.combo-text {
  position: absolute;
  left: 24px;
  bottom: 24px;
  font-size: 64px;
  font-weight: 900;
  font-style: italic;
  color: #00f2ff;
  opacity: 0.4;
  pointer-events: none;
  user-select: none;
  transition: transform 0.1s, opacity 0.1s;
}

.combo-text.combo-hot {
  color: #ff2d55;
  opacity: 0.8;
  text-shadow: 0 0 20px #ff2d55;
}

@media (max-width: 768px) {
  .stat-group {
    gap: 16px;
  }
  .stat-value {
    font-size: 16px;
  }
  .game-header {
    padding: 8px 190px 8px 12px;
  }
  .final-stats {
    flex-wrap: wrap;
    gap: 12px;
  }
  .live-leaderboard {
    width: 170px;
  }
}

/* 实时排行榜侧边栏 */
.live-leaderboard {
  position: fixed;
  right: 0;
  top: 50px;
  width: 180px;
  height: calc(100vh - 50px);
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(0, 242, 255, 0.2);
  z-index: 30;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.lb-header {
  padding: 12px 12px 8px;
  border-bottom: 1px solid rgba(0, 242, 255, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.lb-title {
  font-size: 12px;
  font-weight: bold;
  color: #00f2ff;
  letter-spacing: 1px;
}

.lb-online {
  font-size: 10px;
  color: #00ff88;
}

.lb-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.lb-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  transition: background 0.2s;
}

.lb-item.is-me {
  background: rgba(0, 242, 255, 0.1);
  border-left: 2px solid #00f2ff;
}

.lb-rank {
  width: 24px;
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  color: #888;
  flex-shrink: 0;
}

.lb-name {
  flex: 1;
  font-size: 12px;
  color: #ddd;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lb-score {
  font-size: 12px;
  font-weight: bold;
  color: #00f2ff;
  font-family: monospace;
  flex-shrink: 0;
}

.lb-empty {
  padding: 20px 12px;
  text-align: center;
  color: #666;
  font-size: 12px;
}

/* 超越横幅 */
.overtake-banner {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.3), transparent);
  color: #00ff88;
  font-size: 28px;
  font-weight: 900;
  padding: 8px 40px;
  letter-spacing: 4px;
  z-index: 80;
  animation: overtakeSlide 2s ease-out forwards;
  text-shadow: 0 0 20px #00ff88;
  pointer-events: none;
}

@keyframes overtakeSlide {
  0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  20% { opacity: 1; transform: translateX(-50%) translateY(0); }
  80% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}

/* 追逐HUD */
.chase-hud {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(0, 242, 255, 0.3);
  border-radius: 6px;
  padding: 6px 16px;
  z-index: 40;
  text-align: center;
  backdrop-filter: blur(5px);
}

.chase-label {
  font-size: 10px;
  color: #00f2ff;
  letter-spacing: 1px;
  opacity: 0.7;
}

.chase-name {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  margin: 2px 0;
}

.chase-gap {
  font-size: 11px;
  color: #ff9f00;
  font-weight: bold;
}
</style>
