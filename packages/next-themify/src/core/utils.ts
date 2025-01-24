import { NullOr } from '../types/utils'

export const jsonToMap = (json: NullOr<string>) => {
  if (!json?.trim()) return new Map()
  try {
    const parsed = JSON.parse(json)
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') return new Map()
    const entries = Object.entries(parsed).filter(([key, value]) => typeof key === 'string' && typeof value === 'string') as [string, string][]
    return new Map(entries)
  } catch {
    return new Map()
  }
}
export const mapToJson = (map: Map<string, string>) => JSON.stringify(Object.fromEntries(map))
export const isSameObj = (obj1: Record<string, string>, obj2: Record<string, string>) => {
  if (obj1 === obj2) return true

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!keys2.includes(key) || obj1[key] !== obj2[key]) return false
  }

  return true
}
export const getSystemPref = () => {
  const supportsPref = window.matchMedia('(prefers-color-scheme)').media !== 'not all'
  return supportsPref ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : undefined
}
