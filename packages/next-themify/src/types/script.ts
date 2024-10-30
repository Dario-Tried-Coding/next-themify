import { Config, Custom_Strat, Light_Dark_Strat, Multi_Strat, Prop } from '.'
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
export type Valid_Values = Partial<Record<Prop, Set<string>>>

export type Warn = (msg: string, ...params: any[]) => void
export type Validate_Multi_x_Custom_Strat = (obj: Multi_Strat<string[]> | Custom_Strat<string[]>) => void
export type Validate_Light_Dark_Strat = (obj: Light_Dark_Strat<{ light: string, dark: string, system: string, custom: string[] }>) => void

export type SC_Opts<V extends boolean> = {
  fallback_SC?: Storage_Config
  verbose?: V
}
export type SC_Validation<V extends boolean> = V extends true
  ? {
      SC: Storage_Config
      passed: boolean
      results: Partial<Record<string, [string, boolean]>>
    }
  : {
      SC: Storage_Config
      passed: boolean
    }
export type Validate_SC = <V extends boolean>(obj: Record<string, any> | undefined | null, opts?: SC_Opts<V>) => SC_Validation<V>