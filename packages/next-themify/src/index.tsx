'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react'
import { COLOR_SCHEMES, CONFIG_SK, CUSTOM_SEK, MODE_SK, STRATS } from './constants'
import { useIsMounted } from './hooks/use-is-mounted'
import { script } from './script'
import { Config, Keys } from './types'
import type { Set_Value, Values } from './types/index'
import { Custom_SE, Script_Params } from './types/script'
import { Prettify } from './types/utils'

// CONTEXT
export interface Context<C extends Config<Keys>> {
  values: Prettify<Values<C>> | null
  setValue: Set_Value<C>
}
const Context = createContext<Context<Config<Keys>> | null>(null)

// THEME PROVIDER
interface ThemeProviderProps<K extends Keys, C extends Config<K>> extends PropsWithChildren {
  config: C
  storageKeys?: {
    config?: string
    mode?: string
  }
  transitions?: {
    disable_on_change?: boolean
    nonce?: string
  }
}
export function ThemeProvider<K extends Keys, C extends Config<K>>({ config, storageKeys, transitions, children }: ThemeProviderProps<K, C>) {
  const [values, setValues] = useState<Values<C> | null>(null)
  const isMounted = useIsMounted()

  const configSK = storageKeys?.config || CONFIG_SK

  // #region VALUES - sync -----------------------------------------------------------------------
  useEffect(() => {
    if (!isMounted) return

    const retrievedValues = localStorage.getItem(configSK)
    setValues(retrievedValues ? JSON.parse(retrievedValues) : null)
  }, [isMounted])

  useEffect(() => {
    const handler = (e: StorageEvent | Custom_SE) => {
      const { key, newValue } = e instanceof StorageEvent ? e : e.detail

      if (key === configSK) {
        const newValues = newValue ? JSON.parse(newValue) : null
        setValues(newValues)
      }
    }

    window.addEventListener('storage', handler)
    window.addEventListener(CUSTOM_SEK, handler as EventListener)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener(CUSTOM_SEK, handler as EventListener)
    }
  }, [])
  // #endregion ------------------------------------------------------------------------------------

  // #region VALUE - updater ----------------------------------------------------------------------
  const dispatchCustomSE = useCallback(({ newValue, oldValue }: { newValue: string; oldValue: string }) => {
    const event = new CustomEvent<Custom_SE['detail']>(CUSTOM_SEK, { detail: { key: configSK, newValue, oldValue } })
    window.dispatchEvent(event)
  }, [])
  
  const setValue = <P extends keyof Values<C>>(prop: P, value: Values<C>[P] extends string[] ? Values<C>[P][number] : never) => {
    const newValues = { ...values, [prop]: value }
    dispatchCustomSE({ newValue: JSON.stringify(newValues), oldValue: JSON.stringify(values) })
  }
  // #endregion ------------------------------------------------------------------------------------

  // #region SCRIPT - args -------------------------------------------------------------------------
  const scriptArgs = JSON.stringify({
    storage_keys: {
      config_SK: configSK,
      mode_SK: storageKeys?.mode || MODE_SK,
    },
    custom_SEK: CUSTOM_SEK,
    config: config,
    constants: { STRATS, COLOR_SCHEMES },
    transitions: transitions || {},
  } satisfies Script_Params)
  // #endregion ------------------------------------------------------------------------------------

  return (
    // @ts-ignore
    <Context.Provider value={{ values, setValue }}>
      <script dangerouslySetInnerHTML={{ __html: `(${script.toString()})(${scriptArgs})` }} />
      {children}
    </Context.Provider>
  )
}

export const useNextThemify = <K extends Keys, C extends Config<K>>() => {
  const context = useContext(Context) as Context<C> | null
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
