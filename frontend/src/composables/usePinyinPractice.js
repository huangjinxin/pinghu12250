/**
 * 拼音打字练习核心逻辑
 *
 * 方案：输入时读单字母汉字，完成后完整拼读
 */

import { ref, computed } from 'vue'

// 单字母汉字映射表（输入时使用）
const LETTER_MAP = {
  'a':'阿', 'o':'窝', 'e':'鹅', 'i':'衣', 'u':'乌', 'v':'迂',
  'b':'波', 'p':'坡', 'm':'摸', 'f':'佛',
  'd':'的', 't':'特', 'n':'呢', 'l':'勒',
  'g':'哥', 'k':'科', 'h':'喝',
  'j':'鸡', 'q':'七', 'x':'西',
  'z':'资', 'c':'次', 's':'思', 'r':'日',
  'y':'衣', 'w':'乌'
}

// 拼音部件汉字映射表（完成后使用，优先使用一声）
const PINYIN_VOICE_MAP = {
  // 声母
  'b':'玻', 'p':'坡', 'm':'摸', 'f':'佛',
  'd':'得', 't':'特', 'n':'呢', 'l':'勒',
  'g':'哥', 'k':'科', 'h':'喝',
  'j':'基', 'q':'欺', 'x':'西',
  'zh':'知', 'ch':'吃', 'sh':'诗', 'r':'日',
  'z':'资', 'c':'雌', 's':'思',
  'y':'衣', 'w':'乌',
  // 单韵母
  'a':'阿', 'o':'窝', 'e':'鹅', 'i':'衣', 'u':'乌', 'v':'迂',
  // 复韵母
  'ai':'哀', 'ei':'诶', 'ui':'威', 'ao':'凹', 'ou':'欧', 'iu':'优',
  'ie':'耶', 've':'约', 'er':'儿',
  // 前鼻韵母
  'an':'安', 'en':'恩', 'in':'因', 'un':'温', 'vn':'冤',
  // 后鼻韵母
  'ang':'肮', 'eng':'亨', 'ing':'英', 'ong':'翁',
  // 复合韵母
  'ia':'呀', 'ua':'蛙', 'uo':'窝',
  'iao':'腰', 'uai':'歪',
  'ian':'烟', 'uan':'弯', 'van':'冤',
  'iang':'央', 'uang':'汪', 'iong':'雍'
}

/**
 * 拆解拼音为发音部件
 * @param {string} initial - 声母
 * @param {string} final - 韵母
 * @returns {Array} 部件数组
 */
function splitPinyin(initial, final) {
  try {
    const parts = []

    // 1. 声母
    if (initial) parts.push(initial)

    // 2. 拆解韵母
    if (final) {
      // 如果以介音开头且长度>1，拆出介音
      if (final.length > 1 && 'iuv'.includes(final[0])) {
        parts.push(final[0])      // 介音
        parts.push(final.slice(1)) // 剩余
      } else {
        parts.push(final) // 整体
      }
    }

    return parts
  } catch (error) {
    // fallback：不拆解，直接返回
    return [initial, final].filter(Boolean)
  }
}

/**
 * 播放单字母发音（输入时）
 * @param {string} letter - 字母
 */
function speakLetter(letter) {
  if (!('speechSynthesis' in window)) return

  const char = LETTER_MAP[letter] || letter
  const utterance = new SpeechSynthesisUtterance(char)
  utterance.lang = 'zh-CN'
  utterance.rate = 1.0
  utterance.volume = 1
  speechSynthesis.speak(utterance)
}

/**
 * 播放完整拼读（完成后）
 * @param {Object} charData - 字符数据
 * @returns {Promise}
 */
function speakComplete(charData) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve()
      return
    }

    // 拆解拼音
    const parts = splitPinyin(charData.initial, charData.final)
    const chars = parts.map(p => PINYIN_VOICE_MAP[p] || p)

    // 构建朗读文本：声母汉字, 韵母汉字, 完整拼音, 汉字
    // 例如："喝, 乌, 昂, huáng, 黄"
    const text = chars.join(', ') + `, ${charData.pinyin}, ${charData.char}`

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.6 // 慢速教学
    utterance.volume = 1

    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    speechSynthesis.speak(utterance)
  })
}

export function usePinyinPractice() {
  // ===== 状态 =====
  const chars = ref([])               // 所有字符数据
  const currentIndex = ref(0)          // 当前练习的字符索引
  const typedLetters = ref([])         // 当前字符已输入的字母 [{letter, correct}]
  const showHint = ref(false)          // 是否显示拼音提示
  const isCompleted = ref(false)       // 是否全部完成
  const startTime = ref(null)          // 开始时间
  const charStartTime = ref(null)      // 当前字符开始时间
  const hasError = ref(false)          // 当前是否有未纠正的错误
  const isPlayingAudio = ref(false)    // 是否正在播放音频
  const currentCharErrors = ref(0)     // 当前字符的累计错误次数

  // 提示定时器
  let hintTimer = null

  // 每个字符的练习结果
  const results = ref([])

  // ===== 计算属性 =====
  const currentChar = computed(() => chars.value[currentIndex.value] || null)
  const totalChars = computed(() => chars.value.length)
  const progress = computed(() => `${currentIndex.value + 1}/${totalChars.value}`)

  // 当前字符需要输入的字母序列（无声调）
  const expectedLetters = computed(() => {
    if (!currentChar.value) return []
    return currentChar.value.pinyinLetters.split('')
  })

  // 实时统计
  const totalErrorCount = computed(() => results.value.reduce((sum, r) => sum + r.errors, 0))
  const totalKeysTyped = computed(() => {
    const doneKeys = results.value.reduce((sum, r) => sum + r.typed.length + r.errors, 0)
    const currentKeys = typedLetters.value.length
    return doneKeys + currentKeys
  })
  const totalCorrectKeys = computed(() => {
    const doneCorrect = results.value.reduce((sum, r) => sum + r.typed.length, 0)
    const currentCorrect = typedLetters.value.filter(t => t.correct).length
    return doneCorrect + currentCorrect
  })
  const currentAccuracy = computed(() => {
    if (totalKeysTyped.value === 0) return 100
    return Math.round((totalCorrectKeys.value / totalKeysTyped.value) * 1000) / 10
  })
  const elapsedSeconds = computed(() => {
    if (!startTime.value) return 0
    return Math.round((Date.now() - startTime.value) / 1000)
  })

  // ===== 方法 =====

  /**
   * 初始化练习数据
   * @param {Array} pinyinChars - 后端返回的字符数据
   */
  function initPractice(pinyinChars) {
    chars.value = pinyinChars
    currentIndex.value = 0
    typedLetters.value = []
    showHint.value = false
    isCompleted.value = false
    results.value = []
    hasError.value = false
    currentCharErrors.value = 0
    startTime.value = Date.now()
    charStartTime.value = Date.now()
  }

  /**
   * 处理键盘输入
   * @param {string} key - 按下的键
   * @returns {string} 状态
   */
  function handleKeyInput(key) {
    if (isCompleted.value || !currentChar.value) return 'completed'

    // 如果正在播放音频，阻止输入
    if (isPlayingAudio.value) return 'blocked'

    // 退格键处理
    if (key === 'Backspace') {
      if (hasError.value && typedLetters.value.length > 0) {
        typedLetters.value.pop()
        hasError.value = false
      }
      return 'backspace'
    }

    // 只接受字母或 ü
    if (!/^[a-zü]$/i.test(key)) return 'ignored'

    // 如果有未纠正的错误，不接受新输入
    if (hasError.value) return 'blocked'

    const lowerKey = key.toLowerCase()
    const pos = typedLetters.value.length
    const expected = expectedLetters.value[pos]

    if (!expected) return 'ignored'

    if (lowerKey === expected) {
      // 正确输入
      typedLetters.value.push({ letter: lowerKey, correct: true })

      // 播放字母发音
      speakLetter(lowerKey)

      // 检查当前字符是否全部输入完成
      if (typedLetters.value.length === expectedLetters.value.length) {
        return finishCurrentChar()
      }
      return 'correct'
    } else {
      // 错误输入
      typedLetters.value.push({ letter: lowerKey, correct: false })
      hasError.value = true
      currentCharErrors.value++
      return 'error'
    }
  }

  /**
   * 完成当前字符
   */
  function finishCurrentChar() {
    const char = currentChar.value
    const timeMs = Date.now() - charStartTime.value

    // 保存结果
    results.value.push({
      char: char.char,
      pinyin: char.pinyin,
      pinyinLetters: char.pinyinLetters,
      initial: char.initial,
      final: char.final,
      tone: char.tone,
      typed: char.pinyinLetters,
      errors: currentCharErrors.value,
      timeMs,
    })

    // 设置播放锁
    isPlayingAudio.value = true

    // 播放完整拼读
    speakComplete(char).then(() => {
      isPlayingAudio.value = false

      // 移动到下一个字符
      if (currentIndex.value < chars.value.length - 1) {
        currentIndex.value++
        typedLetters.value = []
        hasError.value = false
        currentCharErrors.value = 0
        charStartTime.value = Date.now()
      } else {
        isCompleted.value = true
      }
    })

    return 'char_done'
  }

  /**
   * 获取完成后的提交数据
   */
  function getSubmitData() {
    const duration = Math.round((Date.now() - startTime.value) / 1000)
    const totalKeys = results.value.reduce((sum, r) => sum + r.typed.length + r.errors, 0)
    const correctKeys = results.value.reduce((sum, r) => sum + r.typed.length, 0)
    const accuracy = totalKeys > 0 ? Math.round((correctKeys / totalKeys) * 1000) / 10 : 100

    return {
      title: chars.value.map(c => c.char).join(''),
      charCount: chars.value.length,
      content: results.value,
      totalKeys,
      correctKeys,
      accuracy,
      duration,
    }
  }

  /**
   * 切换提示显示（2秒后自动隐藏）
   */
  function toggleHint() {
    // 清除之前的定时器
    if (hintTimer) {
      clearTimeout(hintTimer)
      hintTimer = null
    }

    showHint.value = !showHint.value

    // 如果显示了提示，2秒后自动隐藏
    if (showHint.value) {
      hintTimer = setTimeout(() => {
        showHint.value = false
        hintTimer = null
      }, 2000)
    }
  }

  /**
   * 点击汉字播放完整拼读
   */
  function playCharSound(charData) {
    if (charData && !isPlayingAudio.value) {
      speakComplete(charData)
    }
  }

  /**
   * 点击拼音字母播放完整拼读
   */
  function playLetterSound(charData) {
    if (charData && !isPlayingAudio.value) {
      speakComplete(charData)
    }
  }

  return {
    // 状态
    chars,
    currentIndex,
    currentChar,
    typedLetters,
    expectedLetters,
    showHint,
    isCompleted,
    hasError,
    isPlayingAudio,
    totalChars,
    progress,
    results,

    // 统计
    totalErrorCount,
    totalKeysTyped,
    totalCorrectKeys,
    currentAccuracy,
    elapsedSeconds,

    // 方法
    initPractice,
    handleKeyInput,
    toggleHint,
    playCharSound,
    playLetterSound,
    getSubmitData,
  }
}
