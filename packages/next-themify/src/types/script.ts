import { Config as Construct_Config, Props } from './index'
import { STATIC, STRATS } from '../constants'

export type Config = Construct_Config<STATIC>

export type Script_Params = {
  config_SK: string
  config: Config
  constants: {
    STRATS: typeof STRATS
  }
}

export type Storage_Config = Partial<Record<Props, string>>