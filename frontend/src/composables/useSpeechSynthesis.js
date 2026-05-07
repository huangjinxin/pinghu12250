/**
 * useSpeechSynthesis - 朗读功能 composable
 *
 * 使用 Web Speech API 实现文本朗读
 * 支持播放、暂停、继续、停止、语音选择、语速调节
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

// 本地存储键名
const STORAGE_KEY = 'speech_preferences';

// 默认偏好设置
const DEFAULT_PREFERENCES = {
  voiceURI: '',      // 语音标识
  rate: 1.0,         // 语速 (0.5 - 2.0)
  pitch: 1.0,        // 音调 (0.5 - 1.5)
  volume: 1.0        // 音量 (0 - 1)
};

/**
 * 清理 Markdown 标记符号，保留纯文本
 * @param {string} text - 包含 markdown 的文本
 * @returns {string} - 清理后的纯文本
 */
const stripMarkdown = (text) => {
  if (!text) return '';

  return text
    // 移除代码块 ```code```
    .replace(/```[\s\S]*?```/g, '')
    // 移除行内代码 `code`
    .replace(/`([^`]+)`/g, '$1')
    // 移除图片 ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // 移除链接 [text](url)，保留文本
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 移除标题标记 # ## ### 等
    .replace(/^#{1,6}\s+/gm, '')
    // 移除粗体 **text** 或 __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // 移除斜体 *text* 或 _text_（注意不要误删单独的下划线）
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/(?<!\w)_([^_]+)_(?!\w)/g, '$1')
    // 移除删除线 ~~text~~
    .replace(/~~([^~]+)~~/g, '$1')
    // 移除引用 >
    .replace(/^>\s*/gm, '')
    // 移除无序列表标记 - 或 * 或 +
    .replace(/^[\-\*\+]\s+/gm, '')
    // 移除有序列表标记 1. 2. 等
    .replace(/^\d+\.\s+/gm, '')
    // 移除分隔线 --- 或 *** 或 ___
    .replace(/^[\-\*_]{3,}\s*$/gm, '')
    // 移除 HTML 标签
    .replace(/<[^>]+>/g, '')
    // 合并多个空行为一个
    .replace(/\n{3,}/g, '\n\n')
    // 清理首尾空白
    .trim();
};

/**
 * 从 localStorage 读取偏好设置
 */
const loadPreferences = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('读取朗读偏好设置失败:', e);
  }
  return { ...DEFAULT_PREFERENCES };
};

/**
 * 保存偏好设置到 localStorage
 */
const savePreferences = (prefs) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('保存朗读偏好设置失败:', e);
  }
};

export function useSpeechSynthesis() {
  // 状态
  const isPlaying = ref(false);
  const isPaused = ref(false);
  const progress = ref(0);
  const currentText = ref('');
  const isSupported = ref('speechSynthesis' in window);

  // 语音相关
  const voices = ref([]);
  const chineseVoices = ref([]);
  const selectedVoiceURI = ref('');

  // 设置
  const rate = ref(1.0);
  const pitch = ref(1.0);
  const volume = ref(1.0);

  // 内部变量
  let utterance = null;
  let totalLength = 0;

  /**
   * 加载可用语音列表
   */
  const loadVoices = () => {
    if (!isSupported.value) return;

    const availableVoices = window.speechSynthesis.getVoices();
    voices.value = availableVoices;

    // 筛选中文语音
    chineseVoices.value = availableVoices.filter(v =>
      v.lang.includes('zh') ||
      v.lang.includes('cmn') ||
      v.name.includes('中文') ||
      v.name.includes('Chinese')
    ).map(v => ({
      uri: v.voiceURI,
      name: v.name,
      lang: v.lang,
      local: v.localService,
      // 友好名称
      displayName: formatVoiceName(v)
    }));

    // 如果没有选择语音，自动选择第一个中文语音
    if (!selectedVoiceURI.value && chineseVoices.value.length > 0) {
      selectedVoiceURI.value = chineseVoices.value[0].uri;
    }
  };

  /**
   * 格式化语音名称，更友好地显示
   */
  const formatVoiceName = (voice) => {
    let name = voice.name;

    // 移除常见前缀
    name = name.replace('Microsoft ', '')
               .replace('Google ', '')
               .replace('Apple ', '');

    // 添加在线/本地标识
    const typeTag = voice.localService ? '本地' : '在线';

    return `${name} (${typeTag})`;
  };

  /**
   * 初始化：加载偏好设置和语音列表
   */
  const initialize = () => {
    if (!isSupported.value) return;

    // 加载保存的偏好设置
    const prefs = loadPreferences();
    selectedVoiceURI.value = prefs.voiceURI;
    rate.value = prefs.rate;
    pitch.value = prefs.pitch;
    volume.value = prefs.volume;

    // 加载语音列表
    loadVoices();

    // Chrome 需要等待 voiceschanged 事件
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  };

  /**
   * 保存当前设置
   */
  const saveCurrentPreferences = () => {
    savePreferences({
      voiceURI: selectedVoiceURI.value,
      rate: rate.value,
      pitch: pitch.value,
      volume: volume.value
    });
  };

  /**
   * 根据 URI 获取语音对象
   */
  const getVoiceByURI = (uri) => {
    return voices.value.find(v => v.voiceURI === uri);
  };

  /**
   * 开始朗读
   * @param {string} text - 要朗读的文本
   */
  const speak = (text) => {
    if (!isSupported.value) {
      console.warn('当前浏览器不支持语音合成');
      return;
    }

    // 停止当前朗读
    stop();

    // 清理 markdown 标记，获取纯文本
    const cleanText = stripMarkdown(text);

    currentText.value = cleanText;
    totalLength = cleanText.length;
    progress.value = 0;

    // 创建 utterance
    utterance = new SpeechSynthesisUtterance(cleanText);

    // 设置语音
    const voice = getVoiceByURI(selectedVoiceURI.value);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'zh-CN';
    }

    // 设置参数
    utterance.rate = rate.value;
    utterance.pitch = pitch.value;
    utterance.volume = volume.value;

    // 事件监听
    utterance.onstart = () => {
      isPlaying.value = true;
      isPaused.value = false;
    };

    utterance.onpause = () => {
      isPlaying.value = false;
      isPaused.value = true;
    };

    utterance.onresume = () => {
      isPlaying.value = true;
      isPaused.value = false;
    };

    utterance.onend = () => {
      isPlaying.value = false;
      isPaused.value = false;
      progress.value = 100;
    };

    utterance.onerror = (e) => {
      console.error('语音合成错误:', e);
      isPlaying.value = false;
      isPaused.value = false;
    };

    utterance.onboundary = (e) => {
      if (totalLength > 0) {
        progress.value = Math.round((e.charIndex / totalLength) * 100);
      }
    };

    // 开始朗读
    window.speechSynthesis.speak(utterance);
  };

  /**
   * 暂停朗读
   */
  const pause = () => {
    if (isSupported.value && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  };

  /**
   * 继续朗读
   */
  const resume = () => {
    if (isSupported.value && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  };

  /**
   * 停止朗读
   */
  const stop = () => {
    if (isSupported.value) {
      window.speechSynthesis.cancel();
      isPlaying.value = false;
      isPaused.value = false;
      progress.value = 0;
    }
  };

  /**
   * 切换播放/暂停
   */
  const toggle = () => {
    if (isPlaying.value) {
      pause();
    } else if (isPaused.value) {
      resume();
    }
  };

  // 当前是否处于活动状态（播放中或暂停中）
  const isActive = computed(() => isPlaying.value || isPaused.value);

  // 状态文字
  const statusText = computed(() => {
    if (isPlaying.value) return '正在朗读...';
    if (isPaused.value) return '已暂停';
    return '朗读全文';
  });

  // 按钮图标
  const buttonIcon = computed(() => {
    if (isPlaying.value) return 'pause';
    return 'play';
  });

  // 按钮文字
  const buttonText = computed(() => {
    if (isPlaying.value) return '暂停';
    if (isPaused.value) return '继续';
    return '朗读';
  });

  // 当前选中的语音信息
  const currentVoice = computed(() => {
    return chineseVoices.value.find(v => v.uri === selectedVoiceURI.value);
  });

  // 语速显示文本
  const rateText = computed(() => {
    return `${rate.value.toFixed(1)}x`;
  });

  // 监听设置变化，自动保存
  watch([selectedVoiceURI, rate, pitch, volume], () => {
    saveCurrentPreferences();
  });

  // 初始化
  onMounted(() => {
    initialize();
  });

  // 组件卸载时停止朗读
  onUnmounted(() => {
    stop();
  });

  return {
    // 状态
    isPlaying,
    isPaused,
    isActive,
    progress,
    currentText,
    isSupported,
    statusText,
    buttonIcon,
    buttonText,

    // 语音相关
    voices,
    chineseVoices,
    selectedVoiceURI,
    currentVoice,

    // 设置
    rate,
    rateText,
    pitch,
    volume,

    // 方法
    speak,
    pause,
    resume,
    stop,
    toggle,
    loadVoices,
    saveCurrentPreferences
  };
}
