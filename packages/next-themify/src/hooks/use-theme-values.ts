import { useEffect, useState } from 'react'
import { Config, Props, Values } from '../types'
import { useIsMounted } from './use-is-mounted'
import { NextThemifyContext } from '../context'
import { useCustomSE } from './use-custom-storage-event'

type Params = {
  keys: {
    configSK: string
    customSEK: string
  }
}
export const useThemeValues = <Ps extends Props, C extends Config<Ps>>({ keys: { configSK, customSEK } }: Params) => {
  const [values, setValues] = useState<Values<Ps, C> | null>(null)
  const isMounted = useIsMounted()
  const dispatchCustomSE = useCustomSE({ keys: { configSK, customSEK }, setValues })

  useEffect(() => {
    if (!isMounted) return

    const string = localStorage.getItem(configSK)
    setValues(string ? (JSON.parse(string) as Values<Ps, C>) : null)
  }, [isMounted])

  const setValue: NextThemifyContext<Ps, C>['setValue'] = (prop, value) => {
    const currentValue = values?.[prop]
    const newValue = typeof value === 'function' ? (value as (currentValue: Values<Ps, C>[typeof prop] | undefined) => Values<Ps, C>[typeof prop])(currentValue) : value
    const newValues = { ...values, [prop]: newValue }
    dispatchCustomSE({ newValue: JSON.stringify(newValues), oldValue: JSON.stringify(values) })
  }

  return [values, setValue] as const
}
