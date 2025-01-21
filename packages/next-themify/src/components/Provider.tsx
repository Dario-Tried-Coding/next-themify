'use client'

import { PropsWithChildren } from 'react'
import { DEFAULT_BEHAVIOUR, EVENTS, MODE_SK, STATE_SK } from '../constants'
import { NextThemifyContext } from '../context'
import { useConfigProcessor } from '../hooks/use-config-processor'
import { useSyncScript } from '../hooks/use-sync-script'
import { Config, Props } from '../types'
import { ScriptParams } from '../types/script'
import { DeepPartial } from '../types/utils'
import { Script } from './Script'

interface NextThemifyProviderProps<Ps extends Props, C extends Config<Ps>> extends PropsWithChildren, DeepPartial<Pick<ScriptParams, 'storageKeys'>>, Partial<Pick<DEFAULT_BEHAVIOUR, 'observers'>> {
  config: C
}
export const NextThemifyProvider = <Ps extends Props, C extends Config<Ps>>({ children, config, storageKeys, observers }: NextThemifyProviderProps<Ps, C>) => {
  const processedConfig = useConfigProcessor({ config, modeHandling: DEFAULT_BEHAVIOUR.mode })

  const scriptParams: ScriptParams = {
    config: processedConfig,
    storageKeys: {
      state: storageKeys?.state ?? STATE_SK,
      mode: storageKeys?.mode ?? MODE_SK,
    },
    events: EVENTS,
    observers: observers ?? DEFAULT_BEHAVIOUR.observers,
  }

  // const [values, setValue] = useSyncScript<Ps, C>({
  //   storageKey: scriptParams.storageKeys.state,
  //   events: scriptParams.events
  // })

  return (
    <NextThemifyContext.Provider value={null}>
      <Script params={scriptParams} />
      {children}
    </NextThemifyContext.Provider>
  )
}
