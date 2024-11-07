import { Config, Custom_Strat, Light_Dark_Strat, Multi_Strat, Prop } from '.'
import { Color_Scheme, MODES, STATIC, STRATS } from '../constants'

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

export type SC_Opts<V extends boolean> = {
  fallback_SC?: Storage_Config
  verbose?: V
}
export type SC_Validation<V extends boolean> = {
  SC: Storage_Config
  valid: boolean
  results: Record<string, [string, boolean]>
} & (V extends true
  ? {
      performed_on: {
        string: string | undefined | null
        obj: object | undefined
      }
    }
  : {})
export type Set_SC_Info<V extends boolean> = {
  must_update: boolean
  retrieved_SC: SC_Validation<V>
  provided_SC: SC_Validation<V>
  is_same: boolean
}

export type CM_Opts<V extends boolean> = {
  fallback_CM?: string
  verbose?: V
  resolve?: boolean
}
export type CM_Validation<V extends boolean> = V extends true
  ? { available_values: string[] } & ({ passed: true; CM: string } | { passed: false; CM: string | undefined; received: string | null })
  : { passed: true; CM: string } | { passed: false; CM: string | undefined }
export type Validate_CM = <V extends boolean>(CM: string | null, opts?: CM_Opts<V>) => CM_Validation<V>

export type Get_SM = <V extends boolean>(opts?: CM_Opts<V>) => CM_Validation<V>

export type CS_Validation = { passed: true; CS: Color_Scheme } | { passed: false; CS: Color_Scheme; received: string | null }
export type Get_CSPref = () => Color_Scheme | undefined
