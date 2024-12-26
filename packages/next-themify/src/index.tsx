'use client'

import { createContext, PropsWithChildren, useContext, useState } from 'react'
import { COLOR_SCHEMES, CONFIG_SK, MODE_SK, STRATS } from './constants'
import { script } from './script'
import { Config, Keys } from './types'
import { Static_Config, Values } from './types/index'
import { Script_Params } from './types/script'
import { Prettify } from './types/utils'

type ThemingContext<K extends Keys, C extends Config<K>> = {
  values: Prettify<Values<K, C>> | null
  setValue: <P extends keyof Prettify<Values<K, C>>>(prop: P, value: Prettify<Values<K, C>>[P] | ((curr: Prettify<Values<K, C>>[P]) => Prettify<Values<K, C>>[P])) => void
}
const ThemingContext = createContext<ThemingContext<any, any> | null>(null)

interface ThemingProviderProps<K extends Keys, C extends Config<K>> extends PropsWithChildren {
  config: C
  keys?: {
    storageConfig?: string
    storageMode?: string
  }
}
export function ThemingProvider<K extends Keys, C extends Config<K>>({ children, config, keys }: ThemingProviderProps<K, C>) {
  const [values, setValues] = useState<Prettify<Values<K, C>> | null>(null)

  const setValue: ThemingContext<K, C>['setValue'] = (prop, value) => {
    const currentValue = values?.[prop]
    const newValue = typeof value === 'function' ? (value as (currentValue: Prettify<Values<K, C>>[typeof prop] | undefined) => Prettify<Values<K, C>>[typeof prop])(currentValue) : value
    const newValues = { ...values, [prop]: newValue }
    alert('Changing from ' + JSON.stringify(currentValue) + ' to ' + JSON.stringify(newValue))
  }

  const scriptArgs = JSON.stringify({
    config: config as unknown as Static_Config,
    constants: { STRATS, COLOR_SCHEMES },
    keys: {
      config_SK: keys?.storageConfig || CONFIG_SK,
      mode_SK: keys?.storageMode || MODE_SK,
    },
  } satisfies Script_Params)

  return (
    <ThemingContext.Provider value={{ values, setValue }}>
      <script dangerouslySetInnerHTML={{ __html: `(${script.toString()})(${scriptArgs})` }} />
      {children}
    </ThemingContext.Provider>
  )
}

export function useTheming<K extends Keys, C extends Config<K>>() {
  const context = useContext(ThemingContext) as ThemingContext<K, C> | null
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
