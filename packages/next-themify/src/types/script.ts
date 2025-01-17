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
  listeners: Listener[]
  mode: {
    store: boolean
    selectors: Selector[]
  }
  transitions: {
    disableOnChange: boolean
    nonce?: string
  }
}

export type CustomSE = CustomEvent<{
  key: string
  newValue: string | null
}>