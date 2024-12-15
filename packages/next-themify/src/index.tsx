'use client'

import { createContext, PropsWithChildren, useContext } from 'react'
import { COLOR_SCHEMES, CONFIG_SK, CUSTOM_SEK, MODE_SK, STRATS } from './constants'
import { script } from './script'
import { Config, Keys } from './types'
import { Handled_Values, Script_Params } from './types/script'

// CONTEXT
interface Context extends Handled_Values {}
const Context = createContext<Context | null>(null)

// THEME PROVIDER
interface ThemeProviderProps<K extends Keys> extends PropsWithChildren {
  config_sk?: string
  mode_sk?: string
  custom_sek?: string
  config: Config<K>
}
export function ThemeProvider<K extends Keys = null>({ config_sk, mode_sk, custom_sek, config, children }: ThemeProviderProps<K>) {
  const scriptArgs = JSON.stringify({
    config_SK: config_sk || CONFIG_SK,
    mode_SK: mode_sk || MODE_SK,
    custom_SEK: custom_sek || CUSTOM_SEK,
    config: config,
    constants: { STRATS, COLOR_SCHEMES },
  } satisfies Script_Params)

  return (
    <Context.Provider value={null}>
      <script dangerouslySetInnerHTML={{ __html: `(${script.toString()})(${scriptArgs})` }} />
      {children}
    </Context.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(Context)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}