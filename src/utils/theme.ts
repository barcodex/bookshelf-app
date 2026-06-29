import { Platform } from 'react-native'

const webColors = {
  bg:              '#faf6ed',
  bgInput:         '#f5eed8',
  text:            '#2c1a0e',
  textMuted:       '#7a5c3e',
  textFaint:       '#b09070',
  textEmpty:       '#d4b896',
  border:          '#e0d0b8',
  borderFaint:     'rgba(96,60,20,0.08)' as const,
  accent:          '#8b4513',
  tagActive:       '#8b4513',
  tagActiveBorder: '#8b4513',
  reset:           '#8b4513',
  stars:           '#c87941',
  fontTitle:       'Georgia, "Palatino Linotype", serif' as const,
}

const nativeColors = {
  bg:              '#fff',
  bgInput:         '#fafafa',
  text:            '#111',
  textMuted:       '#666',
  textFaint:       '#aaa',
  textEmpty:       '#ccc',
  border:          '#ddd',
  borderFaint:     'rgba(0,0,0,0.05)' as const,
  accent:          '#000',
  tagActive:       '#111',
  tagActiveBorder: '#111',
  reset:           '#007AFF',
  stars:           '#f5a623',
  fontTitle:       undefined as string | undefined,
}

export const colors = Platform.select({ web: webColors, default: nativeColors })!

export function yearBg(index: number): string {
  if (Platform.OS === 'web') {
    const r = Math.max(225, 250 - index * 8)
    const g = Math.max(200, 242 - index * 13)
    const b = Math.max(165, 225 - index * 18)
    return `rgb(${r},${g},${b})`
  }
  const v = Math.max(228, 252 - index * 6)
  return `rgb(${v},${v},${v})`
}
