/**
 * useSpaceBGM - 星球大战风格太空背景音乐引擎
 * 
 * 使用 Web Audio API 合成，无需外部音频文件
 * - 低音脉冲节奏（心跳 bass）
 * - 合成器琶音（arpeggiated synth）
 * - 军鼓节奏（snare beat）
 * - 太空氛围（space drone）
 * - 进行曲旋律（march melody）
 */

import { ref, watch } from 'vue'

const STORAGE_KEY = 'space_bgm_muted'

// 音阶频率表
const NOTE_FREQ = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'Bb2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00,
}

// 和弦进行（C小调，星球大战常用调性）
const CHORDS = [
  ['C3', 'E3', 'G3'],      // Cm
  ['Ab3', 'C4', 'Eb4'],    // Ab
  ['F3', 'A3', 'C4'],      // F
  ['G3', 'B3', 'D4'],      // G
]

// 主旋律（星球大战风格进行曲）
const MELODY = [
  { note: 'C4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 1.0 },
  { note: 'E4', dur: 0.5 }, { note: 'C4', dur: 0.5 }, { note: 'Bb3', dur: 1.0 },
  { note: 'G3', dur: 0.5 }, { note: 'Bb3', dur: 0.5 }, { note: 'D4', dur: 1.0 },
  { note: 'Bb3', dur: 0.5 }, { note: 'G3', dur: 0.5 }, { note: 'C4', dur: 1.0 },
  { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'C5', dur: 1.0 },
  { note: 'G4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'C4', dur: 1.0 },
]

// 琶音模式
const ARPEGGIO = [
  'C3', 'E3', 'G3', 'C4', 'G3', 'E3',
  'Ab2', 'C3', 'Eb3', 'Ab3', 'Eb3', 'C3',
  'F2', 'A2', 'C3', 'F3', 'C3', 'A2',
  'G2', 'B2', 'D3', 'G3', 'D3', 'B2',
]

export function useSpaceBGM() {
  const ctx = ref(null)
  const muted = ref(localStorage.getItem(STORAGE_KEY) === 'true')
  const playing = ref(false)
  const volume = ref(0.3)
  
  let masterGain = null
  let bassGain = null
  let arpGain = null
  let snareGain = null
  let droneGain = null
  let melodyGain = null
  
  let schedulerTimer = null
  let nextNoteTime = 0
  let currentBeat = 0
  let currentChord = 0
  let currentArp = 0
  let currentMelody = 0
  let melodyNoteTime = 0
  
  const BPM = 120
  const BEAT_DURATION = 60 / BPM // 每拍秒数
  const SCHEDULE_AHEAD = 0.1 // 提前调度时间（秒）
  const LOOKAHEAD_MS = 25 // 调度间隔（毫秒）

  function init() {
    if (!ctx.value) {
      try {
        ctx.value = new (window.AudioContext || window.webkitAudioContext)()
        
        // 创建主增益节点
        masterGain = ctx.value.createGain()
        masterGain.gain.value = muted.value ? 0 : volume.value
        masterGain.connect(ctx.value.destination)
        
        // 创建各轨道增益节点
        bassGain = ctx.value.createGain()
        bassGain.gain.value = 0.6
        bassGain.connect(masterGain)
        
        arpGain = ctx.value.createGain()
        arpGain.gain.value = 0.15
        arpGain.connect(masterGain)
        
        snareGain = ctx.value.createGain()
        snareGain.gain.value = 0.3
        snareGain.connect(masterGain)
        
        droneGain = ctx.value.createGain()
        droneGain.gain.value = 0.08
        droneGain.connect(masterGain)
        
        melodyGain = ctx.value.createGain()
        melodyGain.gain.value = 0.2
        melodyGain.connect(masterGain)
        
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
    if (masterGain) {
      masterGain.gain.value = muted.value ? 0 : volume.value
    }
  }

  function setVolume(v) {
    volume.value = Math.max(0, Math.min(1, v))
    localStorage.setItem('space_bgm_volume', volume.value.toString())
    if (masterGain && !muted.value) {
      masterGain.gain.value = volume.value
    }
  }

  // 低音脉冲（心跳节奏）
  function playBass(time) {
    const osc = ctx.value.createOscillator()
    const gain = ctx.value.createGain()
    const filter = ctx.value.createBiquadFilter()
    
    osc.type = 'sawtooth'
    osc.frequency.value = NOTE_FREQ['C2']
    
    filter.type = 'lowpass'
    filter.frequency.value = 200
    filter.Q.value = 5
    
    gain.gain.setValueAtTime(0.8, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + BEAT_DURATION * 0.8)
    
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(bassGain)
    
    osc.start(time)
    osc.stop(time + BEAT_DURATION)
  }

  // 军鼓节奏
  function playSnare(time, accent = false) {
    const bufferSize = ctx.value.sampleRate * 0.1
    const buffer = ctx.value.createBuffer(1, bufferSize, ctx.value.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    
    const noise = ctx.value.createBufferSource()
    noise.buffer = buffer
    
    const filter = ctx.value.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = accent ? 2000 : 3000
    
    const gain = ctx.value.createGain()
    gain.gain.setValueAtTime(accent ? 0.6 : 0.3, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1)
    
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(snareGain)
    noise.start(time)
  }

  // 合成器琶音
  function playArpeggio(time) {
    const note = ARPEGGIO[currentArp % ARPEGGIO.length]
    currentArp++
    
    const osc = ctx.value.createOscillator()
    const gain = ctx.value.createGain()
    const filter = ctx.value.createBiquadFilter()
    
    osc.type = 'triangle'
    osc.frequency.value = NOTE_FREQ[note]
    
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2000, time)
    filter.frequency.exponentialRampToValueAtTime(500, time + BEAT_DURATION * 0.5)
    
    gain.gain.setValueAtTime(0.3, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + BEAT_DURATION * 0.4)
    
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(arpGain)
    
    osc.start(time)
    osc.stop(time + BEAT_DURATION * 0.5)
  }

  // 太空氛围音（持续低音）
  function startDrone() {
    const osc1 = ctx.value.createOscillator()
    const osc2 = ctx.value.createOscillator()
    const gain = ctx.value.createGain()
    const filter = ctx.value.createBiquadFilter()
    
    osc1.type = 'sine'
    osc1.frequency.value = NOTE_FREQ['C2']
    
    osc2.type = 'sine'
    osc2.frequency.value = NOTE_FREQ['G2']
    
    filter.type = 'lowpass'
    filter.frequency.value = 300
    
    gain.gain.value = 0.5
    
    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(droneGain)
    
    osc1.start()
    osc2.start()
    
    return { osc1, osc2, gain }
  }

  // 主旋律
  function playMelody(time) {
    const melodyNote = MELODY[currentMelody % MELODY.length]
    currentMelody++
    
    const osc = ctx.value.createOscillator()
    const gain = ctx.value.createGain()
    const filter = ctx.value.createBiquadFilter()
    
    osc.type = 'square'
    osc.frequency.value = NOTE_FREQ[melodyNote.note]
    
    filter.type = 'lowpass'
    filter.frequency.value = 3000
    
    const dur = melodyNote.dur * BEAT_DURATION
    gain.gain.setValueAtTime(0.3, time)
    gain.gain.setValueAtTime(0.3, time + dur * 0.8)
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur * 0.95)
    
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(melodyGain)
    
    osc.start(time)
    osc.stop(time + dur)
  }

  // 调度器
  function scheduler() {
    while (nextNoteTime < ctx.value.currentTime + SCHEDULE_AHEAD) {
      const beat = currentBeat % 4
      
      // 低音：每拍都有
      playBass(nextNoteTime)
      
      // 军鼓：第2、4拍（backbeat）
      if (beat === 1 || beat === 3) {
        playSnare(nextNoteTime, beat === 3)
      }
      
      // 琶音：每半拍
      playArpeggio(nextNoteTime)
      
      // 旋律：每2拍
      if (currentBeat % 2 === 0) {
        playMelody(nextNoteTime)
      }
      
      // 更新下一拍时间
      nextNoteTime += BEAT_DURATION / 2 // 半拍为单位
      currentBeat++
    }
  }

  function start() {
    init()
    if (playing.value) return
    
    playing.value = true
    currentBeat = 0
    currentChord = 0
    currentArp = 0
    currentMelody = 0
    nextNoteTime = ctx.value.currentTime + 0.1
    
    // 启动太空氛围音
    startDrone()
    
    // 启动调度器
    schedulerTimer = setInterval(scheduler, LOOKAHEAD_MS)
  }

  function stop() {
    if (!playing.value) return
    
    playing.value = false
    if (schedulerTimer) {
      clearInterval(schedulerTimer)
      schedulerTimer = null
    }
  }

  function toggle() {
    if (playing.value) {
      stop()
    } else {
      start()
    }
  }

  // 初始化音量
  const savedVolume = localStorage.getItem('space_bgm_volume')
  if (savedVolume !== null) {
    volume.value = parseFloat(savedVolume)
  }

  return {
    muted,
    playing,
    volume,
    toggleMute,
    setVolume,
    start,
    stop,
    toggle,
  }
}
