/**
 * 朗读服务 - Web Speech API 封装
 * 使用浏览器原生 TTS 功能
 */

// 中文语音引用
let chineseVoice = null;
let voicesLoaded = false;

/**
 * 初始化语音服务
 * 优先选择中文语音
 */
export function initSpeech() {
  return new Promise((resolve) => {
    if (voicesLoaded && chineseVoice) {
      resolve(true);
      return;
    }

    const checkVoices = () => {
      const voices = speechSynthesis.getVoices();

      // 优先选择中文语音
      // 1. 先找 zh-CN
      chineseVoice = voices.find(v =>
        v.lang === 'zh-CN' || v.lang === 'zh_CN'
      );

      // 2. 再找任意中文
      if (!chineseVoice) {
        chineseVoice = voices.find(v =>
          v.lang.startsWith('zh')
        );
      }

      // 3. macOS/iOS 的中文语音名称
      if (!chineseVoice) {
        chineseVoice = voices.find(v =>
          v.name.includes('中文') ||
          v.name.includes('Chinese') ||
          v.name.includes('Tingting') ||
          v.name.includes('Sinji')
        );
      }

      voicesLoaded = true;

      if (chineseVoice) {
        console.log('[Speech] 已选择中文语音:', chineseVoice.name);
      } else if (voices.length > 0) {
        console.warn('[Speech] 未找到中文语音，将使用默认语音');
      }

      resolve(!!chineseVoice || voices.length > 0);
    };

    // 语音可能异步加载
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      checkVoices();
    } else {
      speechSynthesis.addEventListener('voiceschanged', checkVoices, { once: true });
      // 超时回退
      setTimeout(checkVoices, 1000);
    }
  });
}

/**
 * 朗读文字
 * @param {string} text - 要朗读的文字
 * @param {object} options - 配置选项
 * @returns {Promise}
 */
export function speak(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!text || !text.trim()) {
      resolve();
      return;
    }

    // 停止当前朗读
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());

    // 使用中文语音
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }

    // 设置参数（适合儿童学习，稍慢）
    utterance.rate = options.rate || 0.85;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      // 忽略 interrupted 错误（用户主动停止）
      if (e.error === 'interrupted') {
        resolve();
      } else {
        reject(e);
      }
    };

    speechSynthesis.speak(utterance);
  });
}

/**
 * 停止朗读
 */
export function stopSpeaking() {
  speechSynthesis.cancel();
}

/**
 * 检查是否正在朗读
 */
export function isSpeaking() {
  return speechSynthesis.speaking;
}

/**
 * 获取当前选择的语音
 */
export function getCurrentVoice() {
  return chineseVoice;
}
