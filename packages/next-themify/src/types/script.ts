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

export type SM_Validation = {
  passed: boolean
  SM: string
  performed_on: string | undefined | null
  available_values: NonNullable<Available_Values['mode']>
}
export type Set_SM_Info = {
  must_update: boolean
  retrieved_SM: SM_Validation
  provided_SM: SM_Validation
  is_same: boolean
}

export type CS_Validation = { passed: boolean; CS: CS; performed_on: string | undefined | null, avalable_values: Set<CS> }
