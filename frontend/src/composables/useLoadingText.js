import { ref, onUnmounted } from 'vue';

/**
 * 随机循环显示加载提示文本
 * @param {Array} texts - 可选的自定义文本数组
 * @param {number} interval - 切换间隔（毫秒），默认 2500ms
 * @returns {{ loadingText: Ref<string>, start: Function, stop: Function }}
 */
export function useLoadingText(customTexts = null, interval = 2500) {
  // 默认加载提示文本
  const defaultTexts = [
    '大模型正在加载...',
    '正在截图处理...',
    '正在查阅课本...',
    '正在分析文本...',
    '正在思考如何回答...',
    '正在预热GPU芯片...',
    '正在整理思绪...',
    '正在搜索知识库...',
    'AI正在努力思考...',
    '正在理解上下文...',
    '正在组织语言...',
    '正在生成回复...',
    '正在检索相关内容...',
    '正在深度分析...',
    '神经网络运算中...',
    '正在调用算力资源...',
    '知识图谱检索中...',
    '正在匹配最佳答案...'
  ];

  const texts = customTexts || defaultTexts;
  const loadingText = ref(texts[0]);
  let timer = null;
  let currentIndex = 0;

  // 随机打乱数组（Fisher-Yates 洗牌算法）
  const shuffle = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  let shuffledTexts = shuffle(texts);

  // 开始循环切换
  const start = () => {
    // 重新打乱顺序
    shuffledTexts = shuffle(texts);
    currentIndex = 0;
    loadingText.value = shuffledTexts[0];

    // 清除之前的定时器
    if (timer) {
      clearInterval(timer);
    }

    timer = setInterval(() => {
      currentIndex = (currentIndex + 1) % shuffledTexts.length;
      // 如果循环完一轮，重新打乱
      if (currentIndex === 0) {
        shuffledTexts = shuffle(texts);
      }
      loadingText.value = shuffledTexts[currentIndex];
    }, interval);
  };

  // 停止循环
  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  // 组件卸载时自动清理
  onUnmounted(() => {
    stop();
  });

  return {
    loadingText,
    start,
    stop
  };
}

export default useLoadingText;
