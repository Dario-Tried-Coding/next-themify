'use client'

import { Context, createContext, useContext } from 'react'
import { Config, Props, Values } from './types'

export type NextThemifyContext<Ps extends Props, C extends Config<Ps>> = {
  values: Values<Ps, C> | null
  // setValue: <P extends keyof Values<Ps, C>>(prop: P, value: Values<Ps, C>[P] | ((curr: Values<Ps, C>[P]) => Values<Ps, C>[P])) => void
  // availableValues: Record<keyof Values<Ps, C>, Values<Ps, C>[keyof Values<Ps, C>][]>
}
export const NextThemifyContext = createContext<NextThemifyContext<any, any> | null>(null)

export const useNextThemify = <Ps extends Props, C extends Config<Ps>>() => {
  const context = useContext(NextThemifyContext as Context<NextThemifyContext<Ps, C> | null>)
  if (!context) throw new Error('useNextThemify must be used within a NextThemifyProvider')
  return context
}
