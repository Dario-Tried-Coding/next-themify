import { useState, useEffect, useCallback } from 'react'

type MessageHandler = (payload: any) => void
type Subscription = {
  topic: string
  handler: MessageHandler
}

interface MessageBus {
  publish: (topic: string, payload: any) => void
  subscribe: (topic: string, handler: MessageHandler) => () => void
  unsubscribe: (topic: string, handler: MessageHandler) => void
  clearTopic: (topic: string) => void
  clearAll: () => void
}

export const useMessageBus = (): MessageBus => {
  // Use useState to maintain subscribers across renders
  const [subscribers, setSubscribers] = useState<Subscription[]>([])

  // Publish a message to all subscribers of a topic
  const publish = useCallback(
    (topic: string, payload: any) => {
      subscribers.forEach((subscription) => {
        if (subscription.topic === topic) {
          subscription.handler(payload)
        }
      })
    },
    [subscribers]
  )

  // Subscribe to a topic and return an unsubscribe function
  const subscribe = useCallback((topic: string, handler: MessageHandler) => {
    setSubscribers((prev) => [...prev, { topic, handler }])

    // Return unsubscribe function
    return () => {
      unsubscribe(topic, handler)
    }
  }, [])

  // Unsubscribe a specific handler from a topic
  const unsubscribe = useCallback((topic: string, handler: MessageHandler) => {
    setSubscribers((prev) => prev.filter((subscription) => !(subscription.topic === topic && subscription.handler === handler)))
  }, [])

  // Clear all subscribers for a specific topic
  const clearTopic = useCallback((topic: string) => {
    setSubscribers((prev) => prev.filter((subscription) => subscription.topic !== topic))
  }, [])

  // Clear all subscribers
  const clearAll = useCallback(() => {
    setSubscribers([])
  }, [])

  // Clean up all subscriptions when the hook unmounts
  useEffect(() => {
    return () => {
      clearAll()
    }
  }, [clearAll])

  return {
    publish,
    subscribe,
    unsubscribe,
    clearTopic,
    clearAll,
  }
}
