import { Config as Construct_Config } from './index'
import { STRATS } from '../constants'

export type Config = Construct_Config<null>

export type Script_Params = {
  config_SK: string
  config: Config
  constants: {
    STRATS: typeof STRATS
  }
}

export type Storage_Config = Partial<Record<keyof Config, string>>
