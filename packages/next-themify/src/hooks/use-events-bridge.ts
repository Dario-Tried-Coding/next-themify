'use client'

import { useCallback, useEffect } from 'react'
import { CustomSE } from '../types/script'

interface Params<T, E extends CustomEvent> {
  listenFor: {
    event: string
    storageKey: string
    cb: (arg: T) => void
  }
  dispatch: {
    eventKey: string
  }
}

export const useEventsBridge = <T, E extends CustomEvent>({ listenFor, dispatch }: Params<T, E>) => {
  useEffect(() => {
    const handler = (e: CustomSE) => {
      const { key, newValue } = e.detail

      if (key === listenFor.storageKey) {
        const newValues = (newValue ? JSON.parse(newValue) : null) as T
        listenFor.cb(newValues)
      }
    }

    window.addEventListener(listenFor.event, handler as EventListener)
    return () => window.removeEventListener(listenFor.event, handler as EventListener)
  }, [listenFor])

  const dispatchUpdate = useCallback(
    (detail: E['detail']) => {
      const e = new CustomEvent<CustomSE['detail']>(dispatch.eventKey, { detail })
      window.dispatchEvent(e)
    },
    [dispatch]
  )

  return { dispatchUpdate }
}
