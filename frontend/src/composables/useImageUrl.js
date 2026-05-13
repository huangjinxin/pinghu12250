const API_BASE = '/api'

const SIZES = {
  grid: 320,
  card: 400,
  carousel: 300,
  detail: 1200,
  square: 200,
}

export function useImageUrl() {
  function getThumbUrl(path, size = 'grid') {
    if (!path) return ''
    if (path.startsWith('http')) return path
    const width = SIZES[size] || SIZES.grid
    return `${API_BASE}/img-proxy?url=${encodeURIComponent(path)}&w=${width}&q=80`
  }

  function getImageUrl(path) {
    if (!path) return ''
    if (path.startsWith('http')) return path
    return path
  }

  return { getThumbUrl, getImageUrl }
}
