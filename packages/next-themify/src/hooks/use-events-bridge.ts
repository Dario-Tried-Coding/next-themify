'use client'

import { useCallback, useEffect } from 'react'
import { CustomSE } from '../types/script'

interface Params<T, E extends CustomEvent> {
  listenFor: {
    eventKey: string
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

      if (key === listenFor.eventKey) {
        const newValues = (newValue ? JSON.parse(newValue) : null) as T
        listenFor.cb(newValues)
      }
    }

    window.addEventListener(listenFor.eventKey, handler as EventListener)
    return () => window.removeEventListener(listenFor.eventKey, handler as EventListener)
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
