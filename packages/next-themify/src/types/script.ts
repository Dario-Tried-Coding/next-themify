import { StaticConfig } from './react'

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
  listeners: ('attributes' | 'storage')[]
}

export type CustomSE = CustomEvent<{
  key: string
  newValue: string | null
}>