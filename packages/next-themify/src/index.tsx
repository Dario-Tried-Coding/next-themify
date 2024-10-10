'use client'

import { createContext, PropsWithChildren } from 'react'
import { script } from './script'
import { Config, Keys } from './types'
import { Script_Params } from './types/script'
import { CONFIG_SK, DEFAULT, MODES, STRATS } from './constants'

// CONTEXT
interface ContextProps {
  test: 'test'
}
const Context = createContext<ContextProps | null>(null)

// THEME PROVIDER
interface ThemeProviderProps<K extends Keys> extends PropsWithChildren {
  config_sk?: string
  config: Config<K>
}
export function ThemeProvider<K extends Keys = never>({ config_sk, config, children }: ThemeProviderProps<K>) {
  const scriptArgs = JSON.stringify({
    config_SK: config_sk || CONFIG_SK,
    config: config,
    constants: {
      STRATS,
      MODES,
      DEFAULT,
    },
  } satisfies Script_Params)

  return (
    <Context.Provider value={null}>
      <script dangerouslySetInnerHTML={{ __html: `(${script.toString()})(${scriptArgs})` }} />
      {children}
    </Context.Provider>
  )
}
