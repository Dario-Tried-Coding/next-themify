'use client'

import { PropsWithChildren } from 'react'
import { Config, Props } from '../types'
import { CONFIG_SK, CUSTOM_SEK, MODE_SK } from '../constants'
import { NextThemifyContext } from '../context'
import { Script } from './Script'
import { useValues } from '../hooks/use-theme-values'

interface NextThemifyProviderProps<Ps extends Props, C extends Config<Ps>> extends PropsWithChildren {
  config: C
  keys?: {
    configSK?: string
    modeSK?: string
    customSEK?: string
  }
}
export const NextThemifyProvider = <Ps extends Props, C extends Config<Ps>>({ children, config, keys }: NextThemifyProviderProps<Ps, C>) => {
  const configSK = keys?.configSK ?? CONFIG_SK
  const modeSK = keys?.modeSK ?? MODE_SK
  const customSEK = keys?.customSEK ?? CUSTOM_SEK

  const [values, setValue] = useValues<Ps, C>({ configSK: keys?.configSK ?? CONFIG_SK })

  return (
    <NextThemifyContext.Provider value={{ values, setValue }}>
      <Script params={{ config, keys: { configSK, modeSK, customSEK } }} />
      {children}
    </NextThemifyContext.Provider>
  )
}
