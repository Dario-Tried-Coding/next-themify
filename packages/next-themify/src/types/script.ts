import { Custom_Mode_Strat, Light_Dark_Mode_Opts, Mono_Strat, Multi_Strat } from '.'
import { DEFAULT, LIGHT_DARK, MODES, STRATS } from '../constants'
import { AtLeastOne } from './utils'

type Config_Strats = Mono_Strat<string> | Multi_Strat<string[]>
type Mode_Strats =
  | Mono_Strat<string>
  | {
      strategy: LIGHT_DARK
      enableSystem: boolean
      keys: Light_Dark_Mode_Opts
      default: string
      fallback?: string
    }
  | Custom_Mode_Strat<string[]>

export type Config = {
  theme?: Config_Strats
  mode?: Mode_Strats
  radius?: Config_Strats
}

export type Script_Params = {
  config_SK: string
  config: Config
  constants: {
    STRATS: typeof STRATS
    MODES: typeof MODES
    DEFAULT: typeof DEFAULT
  }
}

export type Storage_Config = AtLeastOne<{
  theme?: string
  mode?: string
  radius?: string
}>