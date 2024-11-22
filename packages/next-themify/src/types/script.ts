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

export type Handled_Props = Set<Prop>
export type Storage_Values = Map<Prop, string>
export type Default_Values = Map<Prop, string>
export type Available_Values = Map<Prop, Set<string>>
export type Mode_CSs = Map<string, CS>

export type SVs_Sanitization = {
  handled_props: Handled_Props
  were_all_valid: boolean
  performed_on: Nullable<Map<string, string>>
  values: Map<
    string,
    {
      prop: string
      is_handled: boolean
      value: Nullable<string>
      was_valid: UndefinedOr<boolean>
      sanitized_value: UndefinedOr<string>
      is_fallback: UndefinedOr<boolean>
      was_provided: UndefinedOr<boolean>
      available_values: ReturnType<Available_Values['get']>
      default_value: ReturnType<Default_Values['get']>
    }
  >
}
export type Set_SVs = {
  handled_props: Handled_Props
  values: Map<
    string,
    {
      prop: string
      is_handled: boolean
      old: { value: Nullable<string>; was_valid: UndefinedOr<boolean> }
      new: { value: Nullable<string>; was_valid: UndefinedOr<boolean> }
      updated_value: UndefinedOr<string>
      was_provided: boolean
      was_same: boolean
      is_fallback: UndefinedOr<boolean>
      got_updated: UndefinedOr<boolean>
      available_values: ReturnType<Available_Values['get']>
      default_value: ReturnType<Default_Values['get']>
    }
  >
  executed_update: boolean
  old_values: Map<string, Nullable<string>>
  provided_values: Map<string, string>
  updated_values: Map<string, string>
}

export type Set_TAs = {

}

export type SM_Validation = {
  results: { is_handled: boolean; value: Nullable<string>; valid: boolean }
  fallback_value: UndefinedOr<string>
  valid_SM: UndefinedOr<string>
  available_values: UndefinedOr<Set<string>>
}
export type Set_SM = {
  must_update: boolean
  retrieved_SM: SM_Validation
  received_SM: string
}

export type CS_Validation = {
  results: { is_handled: boolean; mode: Nullable<string>; is_available: boolean; value: Nullable<string>; valid: boolean }
  valid: boolean
  fallback_value: UndefinedOr<CS>
  valid_value: UndefinedOr<CS>
}
export type Set_CS = {
  must_update: boolean
  retrieved_CS: CS_Validation
  received_CS: CS
}
