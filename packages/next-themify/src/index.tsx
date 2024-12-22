'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react'
import { COLOR_SCHEMES, CONFIG_SK, CUSTOM_SEK, MODE_SK, STRATS } from './constants'
import { useIsMounted } from './hooks/use-is-mounted'
import { script } from './script'
import { Config, Keys } from './types'
import type { Values } from './types/index'
import { Custom_SE, Script_Params } from './types/script'
import { Prettify } from './types/utils'

// CONTEXT
export interface Context<K extends Keys, C extends Config<K>> {
  values: Prettify<Values<C>> | null
  setValue: <P extends keyof Prettify<Values<C>>>(prop: P, value: Prettify<Values<C>>[P] | ((curr: Prettify<Values<C>>[P]) => Prettify<Values<C>>[P])) => void
}
const Context = createContext<Context<any, any> | null>(null)

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
  const [values, setValues] = useState<Prettify<Values<C>> | null>(null)
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

  const setValue: Context<K, C>['setValue'] = (prop, value) => {
    const currentValue = values?.[prop]
    const newValue = typeof value === 'function' ? (value as (currentValue: Prettify<Values<C>>[typeof prop] | undefined) => Prettify<Values<C>>[typeof prop])(currentValue) : value
    const newValues = { ...values, [prop]: newValue }
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
    <Context.Provider value={{ values, setValue }}>
      <script dangerouslySetInnerHTML={{ __html: `(${script.toString()})(${scriptArgs})` }} />
      {children}
    </Context.Provider>
  )
}

export const useTheming = <K extends Keys, C extends Config<K>>() => {
  const context = useContext(Context) as Context<K, C> | null
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
