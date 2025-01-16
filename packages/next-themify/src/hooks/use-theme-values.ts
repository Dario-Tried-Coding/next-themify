import { useEffect, useState } from 'react'
import { Config, Props, Values } from '../types'
import { useIsMounted } from './use-is-mounted'
import { NextThemifyContext } from '../context'

type Params = {
  configSK: string
}
export const useValues = <Ps extends Props, C extends Config<Ps>>({ configSK }: Params) => {
  const [values, setValues] = useState<Values<Ps, C> | null>(null)
  const isMounted = useIsMounted()

  useEffect(() => {
    if (!isMounted) return

    const string = localStorage.getItem(configSK)
    setValues(string ? (JSON.parse(string) as Values<Ps, C>) : null)
  }, [isMounted])

  const setValue: NextThemifyContext<Ps, C>['setValue'] = (prop, value) => {
    const currentValue = values?.[prop]
    const newValue = typeof value === 'function' ? (value as (currentValue: Values<Ps, C>[typeof prop] | undefined) => Values<Ps, C>[typeof prop])(currentValue) : value
    const newValues = { ...values, [prop]: newValue }
    setValues(newValues)
    // dispatchCustomSE({ newValue: JSON.stringify(newValues), oldValue: JSON.stringify(values) })
  }

  return [values, setValue] as const
}
