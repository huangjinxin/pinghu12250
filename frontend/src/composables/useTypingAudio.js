/**
 * useTypingAudio - 打字游戏音效引擎
 *
 * 移植自 printword/interstellar-typist.html
 * 支持按键音效、爆炸、烟花、游戏结束等音效
 */

import { ref, watch } from 'vue'

const STORAGE_KEY = 'typing_game_muted'

// 成语数据库 tier: 1=普通 2=精英 3=传说
// condition: 触发条件描述  triggerKey: 触发维度  triggerValue: 触发阈值
const idiomDB = {
  '速度类': [
    { word: '健步如飞', meaning: '步伐矫健轻快，像飞一样，形容走路速度极快。', tier: 1, condition: 'WPM≥25', triggerKey: 'wpm', triggerValue: 25 },
    { word: '电闪雷鸣', meaning: '闪电飞光，雷声轰鸣，比喻来势迅猛、气势浩大。', tier: 1, condition: 'WPM≥28', triggerKey: 'wpm', triggerValue: 28 },
    { word: '快如闪电', meaning: '速度像闪电一样快，形容行动极其迅速敏捷。', tier: 1, condition: 'WPM≥30', triggerKey: 'wpm', triggerValue: 30 },
    { word: '风驰电掣', meaning: '像风奔驰、像电闪过，形容非常迅速、一闪而过。', tier: 1, condition: 'WPM≥32', triggerKey: 'wpm', triggerValue: 32 },
    { word: '一日千里', meaning: '一天能跑一千里，形容进步或发展极其迅速。', tier: 1, condition: 'WPM≥35', triggerKey: 'wpm', triggerValue: 35 },
    { word: '追风逐电', meaning: '追赶风、追逐电，形容速度极快，超越常人。', tier: 2, condition: 'WPM≥45', triggerKey: 'wpm', triggerValue: 45 },
    { word: '瞬息万变', meaning: '在极短时间内发生万千变化，形容变化极快极多。', tier: 2, condition: 'WPM≥50', triggerKey: 'wpm', triggerValue: 50 },
    { word: '目不暇接', meaning: '东西太多眼睛看不过来，形容美好事物太多太丰富。', tier: 2, condition: 'WPM≥55', triggerKey: 'wpm', triggerValue: 55 },
    { word: '雷霆万钧', meaning: '像雷霆一样威力无比、势不可挡，形容力量极大。', tier: 3, condition: 'WPM≥65', triggerKey: 'wpm', triggerValue: 65 },
    { word: '流星赶月', meaning: '像流星追赶月亮，形容行动飞快、争分夺秒。', tier: 3, condition: 'WPM≥75', triggerKey: 'wpm', triggerValue: 75 },
  ],
  '精准类': [
    { word: '百发百中', meaning: '射一百次中一百次，形容射击或做事非常准确有把握。', tier: 1, condition: '准确率≥85%', triggerKey: 'accuracy', triggerValue: 85 },
    { word: '无懈可击', meaning: '没有一点漏洞可以攻击，形容十分严密没有破绽。', tier: 1, condition: '准确率≥88%', triggerKey: 'accuracy', triggerValue: 88 },
    { word: '滴水不漏', meaning: '一滴水也不外漏，形容说话做事周密没有疏漏。', tier: 1, condition: '准确率≥90%', triggerKey: 'accuracy', triggerValue: 90 },
    { word: '运筹帷幄', meaning: '在军帐内谋划指挥，比喻高超的谋略和决策能力。', tier: 1, condition: '准确率≥92%', triggerKey: 'accuracy', triggerValue: 92 },
    { word: '炉火纯青', meaning: '炉火由红转青，比喻功夫达到纯熟完美的境界。', tier: 1, condition: '准确率≥95%', triggerKey: 'accuracy', triggerValue: 95 },
    { word: '弹无虚发', meaning: '每颗子弹都命中目标，形容射击精准无一失误。', tier: 2, condition: '准确率≥96%', triggerKey: 'accuracy', triggerValue: 96 },
    { word: '稳操胜券', meaning: '稳稳地拿着取胜的凭证，形容有充分把握获胜。', tier: 2, condition: '准确率≥97%', triggerKey: 'accuracy', triggerValue: 97 },
    { word: '万无一失', meaning: '绝对不会出差错，形容非常稳妥有绝对把握。', tier: 2, condition: '准确率≥98%', triggerKey: 'accuracy', triggerValue: 98 },
    { word: '登峰造极', meaning: '登上山顶到达最高点，比喻达到最高境界。', tier: 3, condition: '准确率≥99%', triggerKey: 'accuracy', triggerValue: 99 },
    { word: '出神入化', meaning: '技艺达到神妙的境界，形容技术精妙到了极点。', tier: 3, condition: '准确率100%', triggerKey: 'accuracy', triggerValue: 100 },
  ],
  '连击类': [
    { word: '连绵不断', meaning: '连续不断、延绵不绝，形容事物连续不间断的样子。', tier: 1, condition: '10连击', triggerKey: 'combo', triggerValue: 10 },
    { word: '排山倒海', meaning: '推开高山、翻倒大海，形容声势浩大不可阻挡。', tier: 1, condition: '15连击', triggerKey: 'combo', triggerValue: 15 },
    { word: '气吞山河', meaning: '气势可以吞掉山河，形容气魄宏大、气势磅礴。', tier: 1, condition: '20连击', triggerKey: 'combo', triggerValue: 20 },
    { word: '势如破竹', meaning: '形势如同劈竹子一样顺利，比喻节节胜利毫无阻碍。', tier: 1, condition: '25连击', triggerKey: 'combo', triggerValue: 25 },
    { word: '一鼓作气', meaning: '第一次击鼓时士气振奋，比喻趁劲头大时一口气完成。', tier: 1, condition: '30连击', triggerKey: 'combo', triggerValue: 30 },
    { word: '摧枯拉朽', meaning: '摧毁枯草朽木，形容轻而易举地摧毁腐朽势力。', tier: 2, condition: '40连击', triggerKey: 'combo', triggerValue: 40 },
    { word: '锐不可当', meaning: '锋芒锐利不可抵挡，形容勇往直前的气势无人能挡。', tier: 2, condition: '50连击', triggerKey: 'combo', triggerValue: 50 },
    { word: '势不可挡', meaning: '来势迅猛无法阻挡，形容力量强大势如破竹。', tier: 2, condition: '60连击', triggerKey: 'combo', triggerValue: 60 },
    { word: '横扫千军', meaning: '像横扫一样击败千军万马，形容势如破竹所向无敌。', tier: 3, condition: '80连击', triggerKey: 'combo', triggerValue: 80 },
    { word: '所向披靡', meaning: '力量所到之处敌人纷纷倒下，形容势不可挡。', tier: 3, condition: '100连击', triggerKey: 'combo', triggerValue: 100 },
  ],
  '逆袭类': [
    { word: '后来居上', meaning: '后来的超过先前的，形容后辈超过前辈或后进胜过先进。', tier: 1, condition: '得分≥1500', triggerKey: 'score', triggerValue: 1500 },
    { word: '东山再起', meaning: '退隐后再度出任要职，比喻失势后重新恢复地位力量。', tier: 1, condition: '得分≥2000', triggerKey: 'score', triggerValue: 2000 },
    { word: '一鸣惊人', meaning: '一叫就使人震惊，比喻平时默默无闻突然做出惊人成绩。', tier: 1, condition: '得分≥2500', triggerKey: 'score', triggerValue: 2500 },
    { word: '反败为胜', meaning: '扭转败局转为胜利，形容在不利形势下成功逆转。', tier: 1, condition: '得分≥3000', triggerKey: 'score', triggerValue: 3000 },
    { word: '绝地反击', meaning: '在极端困境中发起反击，形容绝境中不放弃最后胜利。', tier: 1, condition: '得分≥4000', triggerKey: 'score', triggerValue: 4000 },
    { word: '逆流而上', meaning: '逆着水流方向前进，比喻迎难而上不畏艰难险阻。', tier: 2, condition: '得分≥5000', triggerKey: 'score', triggerValue: 5000 },
    { word: '卧薪尝胆', meaning: '睡在柴草上舔苦胆，形容刻苦自励发愤图强的决心。', tier: 2, condition: '得分≥6500', triggerKey: 'score', triggerValue: 6500 },
    { word: '破釜沉舟', meaning: '打破饭锅沉掉渡船，比喻下定决心不顾一切干到底。', tier: 2, condition: '得分≥8000', triggerKey: 'score', triggerValue: 8000 },
    { word: '浴火重生', meaning: '经历烈火焚烧后获得新生，比喻历经磨难后获得重生。', tier: 3, condition: '得分≥10000', triggerKey: 'score', triggerValue: 10000 },
    { word: '凤凰涅槃', meaning: '凤凰在火中重生，比喻经历巨大痛苦后获得新的生命。', tier: 3, condition: '得分≥15000', triggerKey: 'score', triggerValue: 15000 },
  ],
  '首击类': [
    { word: '先发制人', meaning: '先动手以制服对方，比喻抢先一步取得主动权。', tier: 1, condition: '消灭5词', triggerKey: 'wordsDestroyed', triggerValue: 5 },
    { word: '一马当先', meaning: '策马冲在最前面，形容领先带头走在最前面。', tier: 1, condition: '消灭8词', triggerKey: 'wordsDestroyed', triggerValue: 8 },
    { word: '捷足先登', meaning: '脚步快的人先到达，比喻行动敏捷的人先达到目的。', tier: 1, condition: '消灭12词', triggerKey: 'wordsDestroyed', triggerValue: 12 },
    { word: '眼疾手快', meaning: '眼光敏锐动作迅速，形容做事机警敏捷反应快。', tier: 1, condition: '消灭15词', triggerKey: 'wordsDestroyed', triggerValue: 15 },
    { word: '当机立断', meaning: '抓住时机立刻决断，形容在关键时刻果断决策不犹豫。', tier: 2, condition: '消灭20词', triggerKey: 'wordsDestroyed', triggerValue: 20 },
    { word: '雷厉风行', meaning: '像雷一样猛烈像风一样快，形容办事声势大行动快。', tier: 2, condition: '消灭25词', triggerKey: 'wordsDestroyed', triggerValue: 25 },
    { word: '势如闪电', meaning: '来势如同闪电一般，形容行动极其迅速令人猝不及防。', tier: 3, condition: '消灭35词', triggerKey: 'wordsDestroyed', triggerValue: 35 },
    { word: '先声夺人', meaning: '先用声势压倒对方，比喻做事抢先一步争取主动。', tier: 3, condition: '消灭50词', triggerKey: 'wordsDestroyed', triggerValue: 50 },
  ],
  '纠错类': [
    { word: '亡羊补牢', meaning: '羊丢了才修羊圈，比喻出了问题后及时补救还不算晚。', tier: 1, condition: '犯错后5连击', triggerKey: 'recovery', triggerValue: 5 },
    { word: '知错能改', meaning: '认识到错误就能够改正，形容有错就改的优良品质。', tier: 1, condition: '犯错后8连击', triggerKey: 'recovery', triggerValue: 8 },
    { word: '悬崖勒马', meaning: '在悬崖边勒住马，比喻到了危险边缘及时醒悟回头。', tier: 1, condition: '犯错后10连击', triggerKey: 'recovery', triggerValue: 10 },
    { word: '力挽狂澜', meaning: '尽力挽回汹涌的波涛，比喻尽力挽回危险的局势。', tier: 1, condition: '犯错后15连击', triggerKey: 'recovery', triggerValue: 15 },
    { word: '迷途知返', meaning: '迷了路知道回来，比喻犯了错误知道改正回到正途。', tier: 2, condition: '犯错后20连击', triggerKey: 'recovery', triggerValue: 20 },
    { word: '浪子回头', meaning: '不务正业的人改过自新，比喻做了坏事的人重新做人。', tier: 2, condition: '犯错后25连击', triggerKey: 'recovery', triggerValue: 25 },
    { word: '痛改前非', meaning: '彻底改正以前的错误，形容下定决心彻底改正错误。', tier: 2, condition: '犯错后30连击', triggerKey: 'recovery', triggerValue: 30 },
    { word: '脱胎换骨', meaning: '脱去旧胎换新骨，比喻彻底改变重新做人焕然一新。', tier: 3, condition: '犯错后40连击', triggerKey: 'recovery', triggerValue: 40 },
    { word: '洗心革面', meaning: '清洗内心改变面貌，比喻彻底悔改重新做人。', tier: 3, condition: '犯错后50连击', triggerKey: 'recovery', triggerValue: 50 },
  ]
}

// 根据当前游戏状态获取可触发的成语
function getTriggerableIdioms(state) {
  // state: { combo, wpm, accuracy, score, wordsDestroyed, recoveryCombo }
  const result = []
  for (const [category, words] of Object.entries(idiomDB)) {
    for (const idiom of words) {
      let triggered = false
      switch (idiom.triggerKey) {
        case 'combo':
          triggered = state.combo >= idiom.triggerValue && state.combo % idiom.triggerValue === 0
          break
        case 'wpm':
          triggered = state.wpm >= idiom.triggerValue
          break
        case 'accuracy':
          triggered = state.accuracy >= idiom.triggerValue
          break
        case 'score':
          triggered = state.score >= idiom.triggerValue && Math.floor(state.score / idiom.triggerValue) === 1
          break
        case 'wordsDestroyed':
          triggered = state.wordsDestroyed === idiom.triggerValue
          break
        case 'recovery':
          triggered = state.recoveryCombo >= idiom.triggerValue && state.recoveryCombo % idiom.triggerValue === 0
          break
      }
      if (triggered) {
        result.push({ ...idiom, category })
      }
    }
  }
  return result
}

export function useTypingAudio() {
  const ctx = ref(null)
  const muted = ref(localStorage.getItem(STORAGE_KEY) === 'true')

  function init() {
    if (!ctx.value) {
      try {
        ctx.value = new (window.AudioContext || window.webkitAudioContext)()
      } catch (e) {
        console.warn('AudioContext not supported')
      }
    }
    if (ctx.value && ctx.value.state === 'suspended') {
      ctx.value.resume()
    }
  }

  function toggleMute() {
    muted.value = !muted.value
    localStorage.setItem(STORAGE_KEY, muted.value)
  }

  function playKey(combo = 0) {
    init()
    if (muted.value || !ctx.value) return
    
    const osc = ctx.value.createOscillator()
    const gain = ctx.value.createGain()
    osc.type = 'sine'
    
    const baseFreq = 880
    const pitchShift = Math.min(combo * 40, 800)
    osc.frequency.setValueAtTime(baseFreq + pitchShift, ctx.value.currentTime)
    
    gain.gain.setValueAtTime(0.3, ctx.value.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.value.currentTime + 0.1)
    
    osc.connect(gain)
    gain.connect(ctx.value.destination)
    osc.start()
    osc.stop(ctx.value.currentTime + 0.1)
  }

  function playExplosion() {
    init()
    if (muted.value || !ctx.value) return
    
    const bufferSize = ctx.value.sampleRate * 0.2
    const buffer = ctx.value.createBuffer(1, bufferSize, ctx.value.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.value.createBufferSource()
    noise.buffer = buffer
    
    const filter = ctx.value.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1000
    
    const gain = ctx.value.createGain()
    gain.gain.setValueAtTime(0.8, ctx.value.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.value.currentTime + 0.2)
    
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.value.destination)
    noise.start()
  }

  function playHeavyExplosion() {
    init()
    if (muted.value || !ctx.value) return
    
    const bufferSize = ctx.value.sampleRate * 0.4
    const buffer = ctx.value.createBuffer(1, bufferSize, ctx.value.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.value.createBufferSource()
    noise.buffer = buffer
    
    const filter = ctx.value.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400
    
    const gain = ctx.value.createGain()
    gain.gain.setValueAtTime(1.5, ctx.value.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.value.currentTime + 0.5)
    
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.value.destination)
    noise.start()
  }

  function playFirework() {
    init()
    if (muted.value || !ctx.value) return
    
    const osc = ctx.value.createOscillator()
    const gain = ctx.value.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(200, ctx.value.currentTime)
    osc.frequency.exponentialRampToValueAtTime(10, ctx.value.currentTime + 0.5)
    gain.gain.setValueAtTime(0.5, ctx.value.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.value.currentTime + 0.5)
    osc.connect(gain)
    gain.connect(ctx.value.destination)
    osc.start()
    osc.stop(ctx.value.currentTime + 0.5)
  }

  function playGameOver() {
    init()
    if (muted.value || !ctx.value) return
    
    const osc = ctx.value.createOscillator()
    const gain = ctx.value.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(300, ctx.value.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, ctx.value.currentTime + 1.5)
    gain.gain.setValueAtTime(0.4, ctx.value.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.value.currentTime + 1.5)
    osc.connect(gain)
    gain.connect(ctx.value.destination)
    osc.start()
    osc.stop(ctx.value.currentTime + 1.5)
  }

  function playOvertake() {
    init()
    if (muted.value || !ctx.value) return
    
    const t = ctx.value.currentTime
    const osc = ctx.value.createOscillator()
    const gain = ctx.value.createGain()
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(987.77, t)
    osc.frequency.setValueAtTime(1318.51, t + 0.1)
    
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.5, t + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4)
    
    osc.connect(gain)
    gain.connect(ctx.value.destination)
    osc.start(t)
    osc.stop(t + 0.5)
  }

  function getRandomIdiom(category, combo = 0) {
    const list = idiomDB[category] || idiomDB['连击类']
    const available = list.filter(w => {
      if (w.triggerKey === 'combo') return combo >= w.triggerValue * 0.8
      return true
    })
    return available[Math.floor(Math.random() * available.length)] || list[0]
  }

  function getRandomColor() {
    const colors = ['#00f2ff', '#ff2d55', '#00ff88', '#fff', '#ff9f00', '#bf00ff']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  watch(muted, (newVal) => {
    localStorage.setItem(STORAGE_KEY, newVal)
  })

  return {
    muted,
    toggleMute,
    playKey,
    playExplosion,
    playHeavyExplosion,
    playFirework,
    playGameOver,
    playOvertake,
    getRandomIdiom,
    getRandomColor,
    getTriggerableIdioms,
    idiomDB
  }
}
