'use client'

import { PropsWithChildren } from 'react'
import { Config, Props } from '../types'
import { CONFIG_SK, MODE_SK, UPDATE_STORAGE_CE, STORAGE_UPDATED_CE } from '../constants'
import { NextThemifyContext } from '../context'
import { Script } from './Script'
import { ScriptParams } from '../types/script'
import { useSyncScript } from '../hooks/use-sync-script'
import { DeepPartial } from '../types/utils'

interface NextThemifyProviderProps<Ps extends Props, C extends Config<Ps>> extends PropsWithChildren, Pick<DeepPartial<ScriptParams>, 'storageKeys'>, Pick<ScriptParams, 'listeners'> {
  config: C
}
export const NextThemifyProvider = <Ps extends Props, C extends Config<Ps>>({ children, config, storageKeys, listeners: customizedListeners }: NextThemifyProviderProps<Ps, C>) => {
  const configSK = storageKeys?.configSK ?? CONFIG_SK
  const modeSK = storageKeys?.modeSK ?? MODE_SK
  const updateStorageCE = UPDATE_STORAGE_CE
  const storageUpdatedCE = STORAGE_UPDATED_CE

  const [values, setValue] = useSyncScript<Ps, C>({ storageKey: configSK, events: { updateStorageCE, storageUpdatedCE } })

  const scriptParams: ScriptParams = {
    config,
    storageKeys: { configSK, modeSK },
    events: { updateStorageCE, storageUpdatedCE },
    listeners: customizedListeners ?? [],
  }

  return (
    <NextThemifyContext.Provider value={{ values, setValue }}>
      <Script params={scriptParams} />
      {children}
    </NextThemifyContext.Provider>
  )
}
