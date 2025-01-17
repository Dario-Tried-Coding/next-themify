import { Listener, Selector } from "./types/react"

export const CONFIG_SK = 'next-themify' as const
export const MODE_SK = 'theme' as const

export const STORAGE_UPDATED_CE = 'storage:updated' as const
export const UPDATE_STORAGE_CE = 'storage:update' as const

export const DEFAULT_LISTENERS = [] as const satisfies Listener[]
export const DEFAULT_STORE_MODE = false as const satisfies boolean
export const DEFAULT_SELECTORS = [] as const satisfies Selector[]