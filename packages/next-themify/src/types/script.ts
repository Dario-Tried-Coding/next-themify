import { Config, Prop } from '.'
import { COLOR_SCHEMES, Color_Scheme as CS, MODES, STATIC, STRATS } from '../constants'
import { Nullable, UndefinedOr } from './utils'

export type Script_Params = {
  config_SK: string
  mode_SK: string
  config: Config<STATIC>
  constants: {
    STRATS: typeof STRATS
    MODES: typeof MODES
    COLOR_SCHEMES: typeof COLOR_SCHEMES
  }
}

export type SC = Map<Prop, string>
export type Default_Values = SC
export type Available_Values = Map<Prop, Set<string>>
export type Color_Schemes = Map<string, CS>

export type SC_Validation = {
  results: UndefinedOr<Map<string, { is_handled: boolean; value: Nullable<string>; valid: boolean }>>
  fallback_values: Default_Values
  valid: boolean
  valid_SC: SC
  performed_on: Nullable<string>
  available_values: Available_Values
}
export type Set_SC = {
  must_update: boolean
  retrieved_SC: SC_Validation
  received_SC: SC
}

export type TA_Validation = {
  results: { prop: Nullable<string>; is_handled: boolean; value: Nullable<string>; valid: boolean }
  fallback_value: UndefinedOr<string>
  valid: boolean
  valid_TA: UndefinedOr<{ prop: Prop; value: string }>
  available_values: UndefinedOr<Set<string>>
}
export type Set_TAs = Map<
  Prop,
  {
    must_update: boolean
    retrieved_TA: TA_Validation
    received_TA: {prop: Prop, value: string}
  }
>

export type SM_Validation = {
  valid: boolean
  SM: string
  performed_on: string | undefined | null
  available_values: string[]
}
export type Set_SM_Info = {
  must_update: boolean
  retrieved_SM: SM_Validation
  provided_SM: string
  is_same: boolean
}

export type CS_Validation = {
  valid: boolean
  CS: CS | ''
  performed_on: string | undefined | null
  avalable_values: Set<CS>
}
export type Set_CS_Info = {
  must_update: boolean
  retrieved_CS: CS_Validation
  provided_CS: CS
  is_same: boolean
}
