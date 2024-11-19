'use client'

import { createContext, PropsWithChildren, useContext } from 'react'
import { COLOR_SCHEMES, CONFIG_SK, MODE_SK, MODES, STRATS } from './constants'
import { script } from './script'
import { Config, Keys } from './types'
import { Storage_Values, Script_Params } from './types/script'

// CONTEXT
interface Context extends Storage_Values {}
const Context = createContext<Context | null>(null)

// THEME PROVIDER
interface ThemeProviderProps<K extends Keys> extends PropsWithChildren {
  config_sk?: string
  mode_sk?: string
  config: Config<K>
}
export function ThemeProvider<K extends Keys = null>({ config_sk, mode_sk, config, children }: ThemeProviderProps<K>) {
  const scriptArgs = JSON.stringify({
    config_SK: config_sk || CONFIG_SK,
    mode_SK: mode_sk || MODE_SK,
    config: config,
    constants: { STRATS, MODES, COLOR_SCHEMES },
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