'use client'

import { PropsWithChildren, useEffect, useState } from 'react'
import { DEFAULT_BEHAVIOUR, EVENTS, LIBRARY_NAME } from '../constants'
import { NextThemifyContext } from '../context'
import { useConfigProcessor } from '../hooks/use-config-processor'
import { useIsMounted } from '../hooks/use-is-mounted'
import { Config, Props, Values } from '../types'
import { StorageKeys } from '../types/core'
import { NullOr } from '../types/utils'
import { Core } from '../core'

interface NextThemifyProviderProps<Ps extends Props, C extends Config<Ps>> extends PropsWithChildren, Partial<Pick<DEFAULT_BEHAVIOUR, 'observers'>> {
  config: C
  storageKeys: StorageKeys
}
export const NextThemifyProvider = <Ps extends Props, C extends Config<Ps>>({ children, config, storageKeys, observers }: NextThemifyProviderProps<Ps, C>) => {
  const {constraints, modeConfig} = useConfigProcessor({ config, modeHandling: DEFAULT_BEHAVIOUR.mode })

  const [values, setValues] = useState<Values<Ps, C> | null>(null)
  // const isMounted = useIsMounted()

  // useEffect(() => {
  //   if (!isMounted) return

  //   window.addEventListener(EVENTS.state.sync.response, ((e: CustomEvent<{ payload: NullOr<string> }>) => {
  //     console.log('payload', e.detail)
  //   }) as EventListener)

  //   window.dispatchEvent(new CustomEvent(EVENTS.state.sync.request))
  // }, [isMounted])

  return (
    <NextThemifyContext.Provider value={{values}}>
      {/* <Script /> */}
      {children}
    </NextThemifyContext.Provider>
  )
}
