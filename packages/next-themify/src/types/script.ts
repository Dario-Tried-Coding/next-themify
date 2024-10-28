import { Config as Construct_Config, Prop } from './test'
import { MODES, STATIC, STRATS } from '../constants'

export type Config = Construct_Config<STATIC>

export type Script_Params = {
  config_SK: string
  config: Config
  constants: {
    STRATS: typeof STRATS
    MODES: typeof MODES
  }
}

export type Storage_Config = Partial<Record<Prop, string>>