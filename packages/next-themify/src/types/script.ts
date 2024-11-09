import { Config, Custom_Strat, Light_Dark_Strat, Multi_Strat, Prop } from '.'
import { Color_Scheme as CS, MODES, STATIC, STRATS } from '../constants'

export type Script_Params = {
  config_SK: string
  mode_SK: string
  config: Config<STATIC>
  constants: {
    STRATS: typeof STRATS
    MODES: typeof MODES
  }
}

export type SC = Partial<Record<Prop, string>>
export type Available_Values = Partial<Record<Prop, Set<string>>>

export type SC_Validation = {
  SC: SC
  valid: boolean
  results: Record<string, [string, boolean]>
  performed_on: {
    string: string | undefined | null
    obj: object | undefined
  }
  available_values: Available_Values
}
export type Set_SC_Info = {
  must_update: boolean
  retrieved_SC: SC_Validation
  provided_SC: SC_Validation
  is_same: boolean
}

export type CM_Validation = {
  passed: boolean
  CM: string | undefined | null
  performed_on: string | undefined | null
  available_values: NonNullable<Available_Values['mode']>
}

export type CS_Validation = { passed: false; CS: CS; performed_on: string | undefined | null }
