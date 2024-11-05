import { Config, Custom_Strat, Light_Dark_Strat, Multi_Strat, Prop } from '.'
import { MODES, STATIC, STRATS } from '../constants'

export type Script_Params = {
  config_SK: string
  mode_SK: string
  config: Config<STATIC>
  constants: {
    STRATS: typeof STRATS
    MODES: typeof MODES
  }
}

export type Storage_Config = Partial<Record<Prop, string>>
export type Available_Values = Partial<Record<Prop, Set<string>>>

export type Warn = (msg: string, ...params: any[]) => void
export type Validate_Multi_Strat = (obj: Multi_Strat<string[]>) => void
export type Validate_Custom_Strat = (obj: Custom_Strat<string[]>) => void
export type Validate_Light_Dark_Strat = (obj: Light_Dark_Strat<{ light: string; dark: string; system: string; custom: string[] }>) => void

export type SC_Opts<V extends boolean> = {
  fallback_SC?: Storage_Config
  verbose?: V
}
export type SC_Validation_Executed = { executed: true; results: Record<string, [string, boolean]>; parsed: Record<string, any> }
export type SC_Validation_Not_Executed = { executed: false; received: string | null }
export type SC_Validation<V extends boolean> = V extends true
  ? {
      SC: Storage_Config
      passed: boolean
    } & (SC_Validation_Executed | SC_Validation_Not_Executed)
  : {
      SC: Storage_Config
      passed: boolean
    }
export type Validate_SC = <V extends boolean>(unsafe_string: string | null, opts?: SC_Opts<V>) => SC_Validation<V>
export type Get_SC = <V extends boolean>(opts?: SC_Opts<V>) => SC_Validation<V>
export type Verbose_Set_SC = (
  | { is_valid: false; received: Storage_Config; available_values: Available_Values }
  | { is_valid: true; received: Storage_Config }
) &
  ({ was_valid: boolean } & ({ are_same: true } | { are_same: false; old: string | Record<string, any> | null })) & {
    updated: boolean
  }
export type Set_SC = <V extends boolean>(SC: Storage_Config, opts?: { verbose?: V; force?: boolean }) => V extends true ? Verbose_Set_SC : void

export type CM_Opts<V extends boolean> = {
  fallback_CM?: string
  verbose?: V
  resolve?: boolean
}
export type CM_Validation<V extends boolean> = V extends true
  ? { available_values: string[] } & ({ passed: true; CM: string } | { passed: false; CM: string | undefined; received: string | null })
  : { passed: true; CM: string } | { passed: false; CM: string | undefined }
export type Validate_CM = <V extends boolean>(CM: string | null, opts?: CM_Opts<V>) => CM_Validation<V>
export type Get_CM = <V extends boolean>(opts?: CM_Opts<V>) => CM_Validation<V>