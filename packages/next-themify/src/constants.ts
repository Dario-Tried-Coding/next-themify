import { Observer, Selector } from './types/react'
import { ScriptParams } from './types/script'

export const STATE_SK = 'next-themify' as const
export const MODE_SK = 'theme' as const

export const EVENTS = {
  state: {
    update: {
      request: {
        mono: `${STATE_SK}:state:update:req:mono`,
        multi: `${STATE_SK}:state:update:req:multi`,
      },
      notify: `${STATE_SK}:state:update:notify`,
    },
    sync: {
      request: `${STATE_SK}:state:sync:req`,
      response: `${STATE_SK}:state:sync:res`,
    },
  },
} as const satisfies ScriptParams['events']

export type DEFAULT_BEHAVIOUR = {
  observers: Observer[]
  mode: {
    selectors: Selector[]
    store: boolean
  }
}
export const DEFAULT_BEHAVIOUR = {
  observers: [],
  mode: {
    selectors: [],
    store: false,
  },
} as const satisfies DEFAULT_BEHAVIOUR
