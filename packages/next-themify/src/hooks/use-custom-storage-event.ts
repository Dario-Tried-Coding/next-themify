'use client'

import { Dispatch, SetStateAction, useCallback, useEffect } from 'react'
import { CustomSE } from '../types/script'
import { Config, Props, Values } from '../types'

interface Params<Ps extends Props, C extends Config<Ps>> {
  keys: {
    customSEK: string
    configSK: string
  }
  setValues: Dispatch<SetStateAction<Values<Ps, C> | null>>
}
export const useCustomSE = <Ps extends Props, C extends Config<Ps>>({ keys: {configSK, customSEK}, setValues }: Params<Ps, C>) => {
  const dispatchCustomSE = useCallback(
    ({ newValue, oldValue }: Omit<CustomSE['detail'], 'key'>) => {
      const event = new CustomEvent<CustomSE['detail']>(customSEK, { detail: { key: configSK, newValue, oldValue } })
      window.dispatchEvent(event)
    },
    [customSEK, configSK]
  )

  useEffect(() => {
    const handler = (e: CustomSE) => {
      const { key, newValue } = e.detail

      if (key === configSK) {
        const newValues = newValue ? JSON.parse(newValue) as Values<Ps, C> : null
        setValues(newValues)
      }
    }

    window.addEventListener(customSEK, handler as EventListener)
    return () => window.removeEventListener(customSEK, handler as EventListener)
  }, [configSK, customSEK, setValues])

  return dispatchCustomSE
}
