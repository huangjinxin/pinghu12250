export function avatarColorSeed(name) {
  if (!name) return '#666'
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h)
  }
  const color = ((h >>> 0).toString(16)).padStart(6, '0').slice(-6)
  return `#${color}`
}
