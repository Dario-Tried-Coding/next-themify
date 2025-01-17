import { useEffect, useState } from 'react'
import { Config, Props, Values } from '../types'
import { useIsMounted } from './use-is-mounted'
import { NextThemifyContext } from '../context'
import { CustomSE, ScriptParams } from '../types/script'
import { useEventsBridge } from './use-events-bridge'

type Params = {
  storageKey: string
  events: ScriptParams['events']
}
export const useSyncScript = <Ps extends Props, C extends Config<Ps>>({ storageKey, events: { updateStorageCE, storageUpdatedCE } }: Params) => {
  const [values, setValues] = useState<Values<Ps, C> | null>(null)
  const isMounted = useIsMounted()
  
  const { dispatchUpdate } = useEventsBridge<Values<Ps, C> | null, CustomSE>({
    listenFor: { event: storageUpdatedCE, storageKey, cb: setValues },
    dispatch: { eventKey: updateStorageCE }
  })

  useEffect(() => {
    if (!isMounted) return

    const string = localStorage.getItem(storageKey)
    setValues(string ? (JSON.parse(string) as Values<Ps, C>) : null)
  }, [isMounted])

  const setValue: NextThemifyContext<Ps, C>['setValue'] = (prop, value) => {
    const currentValue = values?.[prop]
    const newValue = typeof value === 'function' ? (value as (currentValue: Values<Ps, C>[typeof prop] | undefined) => Values<Ps, C>[typeof prop])(currentValue) : value
    const newValues = { ...values, [prop]: newValue }
    dispatchUpdate({ key: storageKey, newValue: JSON.stringify(newValues) })
  }

  return [values, setValue] as const
}
