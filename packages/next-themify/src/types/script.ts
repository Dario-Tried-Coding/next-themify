import { StaticConfig } from "./react"

export type ScriptParams = {
  config: StaticConfig
  keys: {
    configSK: string
    modeSK: string
    customSEK: string
  }
}