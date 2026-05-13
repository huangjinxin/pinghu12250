import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

export function useLeaderboardCarousel(leaderboardData) {
  const containerRef = ref(null)
  const viewportRef = ref(null)
  const isCarouselMode = ref(false)
  const currentPage = ref(0)
  const isPaused = ref(false)
  const columns = ref(5)
  const rowsPerPage = ref(2)

  const cardsPerPage = computed(() => columns.value * rowsPerPage.value)

  const totalPages = computed(() => {
    const total = leaderboardData.value.length
    if (!total || !cardsPerPage.value) return 1
    return Math.ceil(total / cardsPerPage.value)
  })

  const pages = computed(() => {
    const perPage = cardsPerPage.value
    if (!perPage || !leaderboardData.value.length) return []
    const result = []
    for (let i = 0; i < leaderboardData.value.length; i += perPage) {
      result.push(leaderboardData.value.slice(i, i + perPage))
    }
    return result
  })

  const offsetPercent = computed(() => {
    if (totalPages.value <= 1) return 0
    return (currentPage.value / totalPages.value) * 100
  })

  let resizeObserver = null
  let autoScrollTimer = null

  function getColumnsFromWidth(w) {
    if (w > 1100) return 5
    if (w > 900) return 4
    if (w > 700) return 3
    return 2
  }

  function calcRowsPerPage() {
    return 2
  }

  function checkOverflow() {
    const el = containerRef.value
    if (!el) return

    columns.value = getColumnsFromWidth(window.innerWidth)
    const rect = el.getBoundingClientRect()

    if (rect.bottom > window.innerHeight + 5) {
      if (!isCarouselMode.value) {
        isCarouselMode.value = true
        currentPage.value = 0
      }
      const headerH = document.querySelector('.public-header')?.offsetHeight || 64
      const toolbarH = document.querySelector('.header')?.offsetHeight || 56
      const footerH = document.querySelector('.footer')?.offsetHeight || 36
      const availH = window.innerHeight - headerH - toolbarH - footerH - 24
      rowsPerPage.value = calcRowsPerPage(availH)
    } else {
      if (isCarouselMode.value) {
        isCarouselMode.value = false
        currentPage.value = 0
      }
    }
  }

  function startAutoScroll() {
    stopAutoScroll()
    autoScrollTimer = setInterval(() => {
      if (!isCarouselMode.value || isPaused.value || totalPages.value <= 1) return
      currentPage.value = (currentPage.value + 1) % totalPages.value
    }, 5000)
  }

  function stopAutoScroll() {
    if (autoScrollTimer) {
      clearInterval(autoScrollTimer)
      autoScrollTimer = null
    }
  }

  function pause() { isPaused.value = true }
  function resume() { isPaused.value = false }

  function goToPage(idx) {
    currentPage.value = Math.max(0, Math.min(idx, totalPages.value - 1))
  }

  onMounted(() => {
    nextTick(() => checkOverflow())
    resizeObserver = new ResizeObserver(() => checkOverflow())
    if (containerRef.value) resizeObserver.observe(containerRef.value)
    startAutoScroll()
  })

  onUnmounted(() => {
    stopAutoScroll()
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  })

  watch(leaderboardData, () => {
    nextTick(() => checkOverflow())
  })

  watch(totalPages, (n) => {
    if (currentPage.value >= n) currentPage.value = 0
  })

  return {
    containerRef, viewportRef, isCarouselMode, currentPage,
    totalPages, pages, columns, offsetPercent, isPaused,
    pause, resume, goToPage
  }
}
