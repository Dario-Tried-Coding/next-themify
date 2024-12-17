'use client'

import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react'
import { COLOR_SCHEMES, CONFIG_SK, CUSTOM_SEK, MODE_SK, STRATS } from './constants'
import { useEventQueue } from './hooks/use-event-queue'
import { useIsMounted } from './hooks/use-is-mounted'
import { script } from './script'
import { Config, Keys } from './types'
import { Custom_SE, Script_Params } from './types/script'

// CONTEXT
interface Context {
  values: Record<string, string> | null
}
const Context = createContext<Context | null>(null)

// THEME PROVIDER
interface ThemeProviderProps<K extends Keys> extends PropsWithChildren {
  config_sk?: string
  mode_sk?: string
  config: Config<K>
}
export function ThemeProvider<K extends Keys = null>({ config_sk, mode_sk, config, children }: ThemeProviderProps<K>) {
  const [values, setValues] = useState<Record<string, string> | null>(null)
  const isMounted = useIsMounted()

  const configSK = config_sk || CONFIG_SK

  useEffect(() => {
    if (!isMounted) return

    const retrievedValues = localStorage.getItem(configSK)
    setValues(retrievedValues ? JSON.parse(retrievedValues) : null)
  }, [isMounted])

  const { enqueueEvent } = useEventQueue((e: StorageEvent | Custom_SE) => {
    const { key, newValue, oldValue } = e instanceof StorageEvent ? e : e.detail

    if (key === configSK) {
      const newValues = newValue ? JSON.parse(newValue) : null
      setValues(newValues)
    }
  })

  useEffect(() => {
    window.addEventListener('storage', enqueueEvent)
    window.addEventListener(CUSTOM_SEK, enqueueEvent as EventListener)
    return () => {
      window.removeEventListener('storage', enqueueEvent)
      window.removeEventListener(CUSTOM_SEK, enqueueEvent as EventListener)
    }
  }, [])

  const scriptArgs = JSON.stringify({
    config_SK: configSK,
    mode_SK: mode_sk || MODE_SK,
    custom_SEK: CUSTOM_SEK,
    config: config,
    constants: { STRATS, COLOR_SCHEMES },
  } satisfies Script_Params)

  return (
    <Context.Provider value={{ values }}>
      <script dangerouslySetInnerHTML={{ __html: `(${script.toString()})(${scriptArgs})` }} />
      {children}
    </Context.Provider>
  )
}

export const useValues = () => {
  const context = useContext(Context)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
