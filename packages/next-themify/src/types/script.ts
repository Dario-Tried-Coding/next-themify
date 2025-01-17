import { Listener, Selector, StaticConfig } from './react'

export type ScriptParams = {
  config: StaticConfig
  storageKeys: {
    configSK: string
    modeSK: string
  }
  events: {
    updateStorageCE: string
    storageUpdatedCE: string
  }
  behaviour: {
    listeners: Listener[]
    defaultStoreMode: boolean
    defaultSelectors: Selector[]
  }
}

export type CustomSE = CustomEvent<{
  key: string
  newValue: string | null
}>