import { ref, reactive, computed } from 'vue'

export const DIMENSIONS = {
  MORALITY: '品德',
  INTELLIGENCE: '智慧',
  PHYSIQUE: '体质',
  AESTHETICS: '审美',
  LABOR: '劳动',
  SOCIETY: '社交'
}

export const DIMENSION_CONTENT = {
  MORALITY: {
    question: '这位同学在品德方面有什么让你印象深刻的地方？',
    dropdownOptions: ['诚实守信', '尊重他人', '有责任心', '公平正义', '乐于助人'],
    multiTags: ['诚实', '守信', '尊重', '责任', '正义', '友善'],
    emojis: ['😇', '🙂', '😐', '😟', '😡']
  },
  INTELLIGENCE: {
    question: '这位同学在学习或解决问题方面表现如何？',
    dropdownOptions: ['思维敏捷', '学习认真', '善于思考', '创新创意', '知识面广'],
    multiTags: ['聪明', '认真', '好问', '创新', '专注', '博学'],
    emojis: ['🧠', '📚', '🤔', '😴', '🤷']
  },
  PHYSIQUE: {
    question: '这位同学在体育或健康方面有什么评价？',
    dropdownOptions: ['体能优秀', '运动积极', '健康活力', '坚持锻炼', '体态良好'],
    multiTags: ['健康', '活力', '运动', '坚持', '积极', '阳光'],
    emojis: ['💪', '🏃', '😊', '😰', '🤒']
  },
  AESTHETICS: {
    question: '这位同学在审美或艺术方面有什么特点？',
    dropdownOptions: ['艺术天赋', '品味独特', '审美优秀', '创意十足', '欣赏力强'],
    multiTags: ['审美', '艺术', '创意', '品味', '欣赏', '设计'],
    emojis: ['🎨', '✨', '😍', '😐', '😖']
  },
  LABOR: {
    question: '这位同学在劳动或实践方面表现如何？',
    dropdownOptions: ['勤劳主动', '动手力强', '认真负责', '乐于服务', '实践力强'],
    multiTags: ['勤劳', '动手', '负责', '服务', '实践', '主动'],
    emojis: ['🔧', '🌱', '😊', '😩', '🙅']
  },
  SOCIETY: {
    question: '这位同学在社交或团队合作方面有什么评价？',
    dropdownOptions: ['善于沟通', '团队合作', '人际广泛', '领导力强', '友善亲和'],
    multiTags: ['沟通', '合作', '领导', '友善', '亲和', '团队'],
    emojis: ['🤝', '🗣️', '😄', '😶', '👎']
  }
}

export function useReviewWizard() {
  const step = ref('select') // 'select' | 'fill'
  const selectedDimension = ref(null)
  const selectedTarget = ref(null)

  const form = reactive({
    content: '',
    dropdownValue: '',
    selectedTags: [],
    starRating: 0,
    emoji: '',
    sticker: ''
  })

  const computedScore = computed(() => {
    const d = selectedDimension.value
    if (!d) return 0
    const content = DIMENSION_CONTENT[d]
    if (!content) return 0
    let maxScore = 0
    if (form.emoji) {
      const idx = content.emojis.indexOf(form.emoji)
      if (idx >= 0) maxScore = Math.max(maxScore, 5 - idx)
    }
    if (form.starRating > 0) maxScore = Math.max(maxScore, form.starRating)
    if (form.dropdownValue) {
      const idx = content.dropdownOptions.indexOf(form.dropdownValue)
      if (idx >= 0) maxScore = Math.max(maxScore, 5 - idx)
    }
    if (form.selectedTags.length > 0) {
      maxScore = Math.max(maxScore, Math.min(form.selectedTags.length, 5))
    }
    return maxScore
  })

  const canSubmit = computed(() => {
    const d = selectedDimension.value
    if (!d) return false
    return computedScore.value > 0 && computedScore.value <= 5
  })

  function selectTarget(target) {
    selectedTarget.value = target
    step.value = 'select'
    resetForm()
  }

  function selectDimension(dim) {
    selectedDimension.value = dim
    step.value = 'fill'
    resetForm()
  }

  function resetForm() {
    form.content = ''
    form.dropdownValue = ''
    form.selectedTags = []
    form.starRating = 0
    form.emoji = ''
    form.sticker = ''
  }

  function backToSelect() {
    step.value = 'select'
    selectedDimension.value = null
    resetForm()
  }

  function getSubmitPayload() {
    return {
      toUserId: selectedTarget.value.id,
      dimension: selectedDimension.value,
      score: computedScore.value,
      detail: {
        content: form.content,
        dropdownValue: form.dropdownValue,
        emoji: form.emoji,
        sticker: form.sticker,
        tags: form.selectedTags,
        starRating: form.starRating
      }
    }
  }

  return {
    step, selectedDimension, selectedTarget, form, computedScore, canSubmit,
    selectTarget, selectDimension, backToSelect, resetForm, getSubmitPayload
  }
}
