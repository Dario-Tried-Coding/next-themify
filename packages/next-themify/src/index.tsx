'use client'

import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react'
import { COLOR_SCHEMES, CONFIG_SK, CUSTOM_SEK, MODE_SK, STRATS } from './constants'
import { script } from './script'
import { Config, Keys } from './types'
import { Custom_SE, Handled_Values, Script_Params } from './types/script'
import { useIsMounted } from './hooks/use-is-mounted'

// CONTEXT
interface Context extends Handled_Values {}
const Context = createContext<Context | null>(null)

// THEME PROVIDER
interface ThemeProviderProps<K extends Keys> extends PropsWithChildren {
  config_sk?: string
  mode_sk?: string
  config: Config<K>
}
export function ThemeProvider<K extends Keys = null>({ config_sk, mode_sk, config, children }: ThemeProviderProps<K>) {
  const [theme, setTheme] = useState<Record<string, string> | null>(null)
  const isMounted = useIsMounted()

  const configSK = config_sk || CONFIG_SK

  useEffect(() => {
    if (!isMounted) return

    const retrievedValues = localStorage.getItem(configSK)
    setTheme(retrievedValues ? JSON.parse(retrievedValues) : null)
  }, [isMounted])

  useEffect(() => {
    const handler = (e: StorageEvent | Custom_SE) => {
      const { key, newValue } = e instanceof StorageEvent ? e : e.detail

      if (key === configSK) {
        const newValues = newValue ? JSON.parse(newValue) : null
        setTheme(newValues)
      }
    }

    window.addEventListener('storage', handler)
    window.addEventListener(CUSTOM_SEK, handler as EventListener)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener(CUSTOM_SEK, handler as EventListener)
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
    <Context.Provider value={null}>
      <script dangerouslySetInnerHTML={{ __html: `(${script.toString()})(${scriptArgs})` }} />
      <pre>{JSON.stringify(theme)}</pre>
      {children}
    </Context.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(Context)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
