// @AI:TEMPLATE composable模板
// 使用方式: 复制此文件,重命名为 use[Module][Action].js

import { ref, computed, onMounted, onUnmounted } from 'vue'
// import { [module]API } from '@/api'
// import { use[Module]Store } from '@/stores/[module]'

/**
 * @AI:COMPOSABLE use[Module][Action]
 * @description [描述此composable的职责]
 * @returns {Object} { state, methods }
 */
export function use_TEMPLATE_() {
  // ============ State ============
  const loading = ref(false)
  const error = ref(null)
  const data = ref(null)

  // ============ Computed ============
  const isEmpty = computed(() => !data.value || data.value.length === 0)

  // ============ Methods ============
  async function fetchData(params) {
    loading.value = true
    error.value = null
    try {
      // const result = await [module]API.getList(params)
      // data.value = result.data
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function createItem(item) {
    // await [module]API.create(item)
    // await fetchData()
  }

  async function updateItem(id, item) {
    // await [module]API.update(id, item)
    // await fetchData()
  }

  async function deleteItem(id) {
    // await [module]API.delete(id)
    // await fetchData()
  }

  // ============ Lifecycle ============
  onMounted(() => {
    // 初始化逻辑
  })

  onUnmounted(() => {
    // 清理逻辑
  })

  // ============ Return ============
  return {
    // State
    loading,
    error,
    data,
    isEmpty,
    // Methods
    fetchData,
    createItem,
    updateItem,
    deleteItem,
  }
}
