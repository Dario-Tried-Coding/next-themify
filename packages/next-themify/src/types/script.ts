import { Config, Prop } from '.'
import { MODES, STATIC, STRATS } from '../constants'

export type Script_Params = {
  config_SK: string
  config: Config<STATIC>
  constants: {
    STRATS: typeof STRATS
    MODES: typeof MODES
  }
}

export type Storage_Config = Partial<Record<Prop, string>>