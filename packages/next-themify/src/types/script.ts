import { StaticConfig } from './react'

export type ScriptParams = {
  config: StaticConfig
  keys: {
    configSK: string
    modeSK: string
    customSEK: string
  }
}

export type CustomSE = CustomEvent<{
  key: string
  newValue: string | null
  oldValue: string | null
}>