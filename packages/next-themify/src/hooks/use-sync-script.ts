import { useEffect, useState } from 'react'
import { NextThemifyContext } from '../context'
import { Config, Props, Values } from '../types'
import { ScriptParams } from '../types/script'
import { useIsMounted } from './use-is-mounted'
import { useMessageBus } from './use-message-bus'

type Params = {
  storageKey: string
  events: ScriptParams['events']
}
export const useSyncScript = <Ps extends Props, C extends Config<Ps>>({ storageKey, events }: Params) => {
  const [values, setValues] = useState<Values<Ps, C> | null>(null)
  const isMounted = useIsMounted()
  const {publish, subscribe} = useMessageBus()

  useEffect(() => {
    if (!isMounted) return

    const unsubscribe = publish(events.state.sync.request, undefined)
    return unsubscribe
  }, [publish, isMounted])

  // const setValue: NextThemifyContext<Ps, C>['setValue'] = (prop, value) => {
  //   const currentValue = values?.[prop]
  //   const newValue = typeof value === 'function' ? (value as (currentValue: Values<Ps, C>[typeof prop] | undefined) => Values<Ps, C>[typeof prop])(currentValue) : value
  //   const newValues = { ...values, [prop]: newValue }
  //   publish(events.state.sy{ key: storageKey, newValue: JSON.stringify(newValues) })
  // }

  return [values] as const
}
