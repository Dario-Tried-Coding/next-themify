import { useCallback, useRef } from 'react'
import { Custom_SE } from '../types/script'

type EventProcessor = (e: Custom_SE | StorageEvent) => void

export function useEventQueue(processor: EventProcessor) {
  const queue = useRef<(Custom_SE | StorageEvent)[]>([])
  const isProcessing = useRef(false)

  const enqueueEvent = useCallback((e: Custom_SE | StorageEvent) => {
    console.log('enqueueEvent', e)
    queue.current.push(e)
    processQueue()
  }, [])

  const processQueue = useCallback(() => {
    if (isProcessing.current) return
    
    isProcessing.current = true
    while (queue.current.length > 0) {
      const e = queue.current.shift()
      if (!e) continue
      processor(e)
    }
    isProcessing.current = false
  }, [processor])

  return { enqueueEvent }
}
