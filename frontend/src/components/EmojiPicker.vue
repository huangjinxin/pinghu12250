<template>
  <n-popover trigger="click" placement="top-start" :show-arrow="false" style="padding: 0;">
    <template #trigger>
      <slot>
        <n-button text circle size="small">
          <template #icon>
            <n-icon :size="20"><HappyOutline /></n-icon>
          </template>
        </n-button>
      </slot>
    </template>

    <div class="emoji-picker">
      <div class="emoji-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="emoji-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </div>
      </div>

      <div class="emoji-grid">
        <div
          v-for="emoji in currentEmojis"
          :key="emoji"
          class="emoji-item"
          @click="handleSelect(emoji)"
        >
          {{ emoji }}
        </div>
      </div>
    </div>
  </n-popover>
</template>

<script setup>
import { ref, computed } from 'vue';
import HappyOutline from '@vicons/ionicons5/es/HappyOutline'

const emit = defineEmits(['select']);

const activeTab = ref('smile');

const tabs = [
  { key: 'smile', label: '😊' },
  { key: 'gesture', label: '👋' },
  { key: 'animal', label: '🐶' },
  { key: 'food', label: '🍔' },
  { key: 'activity', label: '⚽' },
  { key: 'travel', label: '🚗' },
  { key: 'object', label: '💡' }
];

const emojis = {
  smile: [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
    '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
    '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
    '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
    '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
    '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
    '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵',
    '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕'
  ],
  gesture: [
    '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏',
    '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
    '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛',
    '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
    '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃',
    '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁', '👅'
  ],
  animal: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵',
    '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤',
    '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
    '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞',
    '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷', '🕸'
  ],
  food: [
    '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇',
    '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
    '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶',
    '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠',
    '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳',
    '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭'
  ],
  activity: [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
    '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
    '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿',
    '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸', '🥌',
    '🎿', '⛷', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺',
    '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏊', '🤽', '🚣'
  ],
  travel: [
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑',
    '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽',
    '🦼', '🛴', '🚲', '🛵', '🏍', '🛺', '🚨', '🚔',
    '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋',
    '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇',
    '🚊', '🚉', '✈️', '🛫', '🛬', '🛩', '💺', '🛰'
  ],
  object: [
    '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖', '📗',
    '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄',
    '📰', '🗞', '📑', '🔖', '🏷', '💰', '🪙', '💴',
    '💵', '💶', '💷', '💸', '💳', '🧾', '💹', '✉️',
    '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪',
    '📬', '📭', '📮', '🗳', '✏️', '✒️', '🖋', '🖊'
  ]
};

const currentEmojis = computed(() => {
  return emojis[activeTab.value] || [];
});

const handleSelect = (emoji) => {
  emit('select', emoji);
};
</script>

<style scoped>
.emoji-picker {
  width: 320px;
  background: white;
}

.emoji-tabs {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.emoji-tab {
  flex: 1;
  padding: 6px;
  text-align: center;
  font-size: 18px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.emoji-tab:hover {
  background: #e5e7eb;
}

.emoji-tab.active {
  background: #8b5cf6;
  transform: scale(1.1);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 12px;
  max-height: 280px;
  overflow-y: auto;
}

.emoji-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.emoji-item:hover {
  background: #f3f4f6;
  transform: scale(1.3);
}

.emoji-grid::-webkit-scrollbar {
  width: 6px;
}

.emoji-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.emoji-grid::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.emoji-grid::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>
