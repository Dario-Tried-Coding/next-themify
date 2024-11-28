import { Config, Prop } from '.'
import { Color_Scheme, COLOR_SCHEMES, Color_Scheme as CS, MODES, STATIC, STRATS } from '../constants'
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

export type Handled_Props = Set<string>
export type Handled_Values = Map<string, string>
export type Default_Values = Map<string, string>
export type Available_Values = Map<string, Set<string>>
export type Mode_CSs = Map<string, CS>

export type HVs_Sanitization = {
  handled_props: Set<string>
  available_values: Map<string, Set<string>>
  default_values: Map<string, string>
  performed_on: Map<string, string>
  are_all_available: boolean
  missing_props: Set<string>
  values: Map<
    string,
    {
      prop: string
      is_handled: boolean
      value: string
      is_available: UndefinedOr<boolean>
      sanitized_value: UndefinedOr<string>
      is_fallback: UndefinedOr<boolean>
      was_provided: UndefinedOr<boolean>
      available_values: NonNullable<ReturnType<Available_Values['get']>>
      default_value: ReturnType<Default_Values['get']>
    }
  >
}
export type HVs_Update = {
  handled_props: Set<string>
  available_values: Map<string, Set<string>>
  default_values: Map<string, string>
  values: Map<
    string,
    {
      prop: string
      is_handled: boolean
      old: { value: Nullable<string>; was_available: UndefinedOr<boolean> }
      new: { value: Nullable<string>; was_available: UndefinedOr<boolean> }
      updated_value: UndefinedOr<string>
      was_provided: boolean
      is_same: boolean
      was_same: boolean
      is_fallback: UndefinedOr<boolean>
      got_updated: UndefinedOr<boolean>
      available_values: NonNullable<ReturnType<Available_Values['get']>>
      default_value: ReturnType<Default_Values['get']>
    }
  >
  executed_update: boolean
  old_values: Map<string, string>
  provided_values: Map<string, string>
  updated_values: Map<string, string>
}

export type SM_Sanitization = {
  is_handled: boolean
  value: Nullable<string>
  is_available: UndefinedOr<boolean>
  sanitized_value: UndefinedOr<string>
  is_fallback: UndefinedOr<boolean>
  available_values: NonNullable<ReturnType<Available_Values['get']>>
  default_value: ReturnType<Default_Values['get']>
}
export type SM_Update = {
  is_handled: boolean
  old: { value: Nullable<string>, was_available: UndefinedOr<boolean> }
  new: { value: Nullable<string>, was_available: UndefinedOr<boolean> }
  updated_value: UndefinedOr<string>
  was_same: boolean
  is_same: boolean
  is_fallback: UndefinedOr<boolean>
  got_updated: UndefinedOr<boolean>
  available_values: NonNullable<ReturnType<Available_Values['get']>>
  default_value: ReturnType<Default_Values['get']>
}

export type CS_Sanitization = {
  is_handled: boolean
  mode: Nullable<string>
  value: Nullable<string>
  correct_value: UndefinedOr<string>
  is_correct: UndefinedOr<boolean>
}
export type CS_Update = {
  is_handled: boolean
  mode: Nullable<string>
  old_value: { value: Nullable<string>, was_correct: UndefinedOr<boolean> }
  correct_value: UndefinedOr<string>
  was_same: UndefinedOr<boolean>
  got_updated: UndefinedOr<boolean>
}