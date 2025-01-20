import { ColorScheme, ModeProp, Observer, Selector } from './react'
import { NullOr, UndefinedOr } from './utils'

export type ScriptParams = {
  config: {
    constraints: Record<string, { preferred: string; allowed: string[] }>
    mode: NullOr<{ prop: string; stratObj: ModeProp; resolvedModes: Record<string, ColorScheme>; selectors: Selector[]; store: boolean }>
  }
  storageKeys: {
    state: string
    mode: string
  }
  events: {
    state: {
      update: {
        request: {
          mono: string
          multi: string
        }
        notify: string
      },
      sync: {
        request: string
        response: string
      }
    }
  }
  defaultBehaviour: {
    mode: {
      store: boolean
      selectors: Selector[]
    }
    observers: Observer[]
  }
}

export interface Store {
  state: NullOr<Record<string, string>>
  constraints: ScriptParams['config']['constraints']
  mode: ScriptParams['config']['mode']
}

export interface StoreMethods {
  utils: {
    jsonToObj: (json: string) => Record<string, string>
    isSameObj: (obj1: Record<string, string>, obj2: Record<string, string>) => boolean
  }
  values: {
    sanitize: {
      mono: (prop: string, value: NullOr<string>, fallback?: NullOr<string>) => { passed: boolean; value: UndefinedOr<string> }
      multi: (values: Record<string, string>, fallbacks?: Record<string, string>) => { passed: boolean; values: Record<string, string>; results: Record<string, { passed: boolean; value: string }> }
    }
  }
  SVs: {
    retrieve: () => Record<string, string>
    store: (values: Record<string, string>) => void
  }
  TAs: {
    get: {
      mono: (prop: string) => NullOr<string>
    }
    set: (values: Record<string, string>) => void
  }
  SM: {
    retrieve: () => NullOr<string>
    store: (mode: string) => void
  }
  RMs: {
    getSystemPref: () => UndefinedOr<ColorScheme>
    derive: (mode: string) => UndefinedOr<ColorScheme>
  },
  CS: {
    get: () => string
    set: (RM: ColorScheme) => void
  }
  MC: {
    get: () => UndefinedOr<ColorScheme>
    set: (RM: ColorScheme) => void
  }
  state: {
    set: {
      mono: (prop: string, value: string) => void
      multi: (values: Record<string, string>) => void
    }
    get: {
      all: () => Store['state']
    }
    apply: (values: Record<string, string>) => void
  }
}

export type StateSync_Event = CustomEvent<{ state: Store['state']}>