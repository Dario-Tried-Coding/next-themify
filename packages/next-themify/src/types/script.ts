import { Config } from '.'
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

export type Handled_Props = Set<string>
export type Handled_Values = Map<string, string>
export type Default_Values = Map<string, string>
export type Available_Values = Map<string, Set<string>>
export type Mode_CSs = Map<string, CS>

export type HVs_Sanitization = {
  ctx: {
    handled_props: Set<string>
    available_values: Map<string, Set<string>>
    default_values: Map<string, string>
  }
  performed_on: Map<string, string>
  are_proper_values: boolean
  missing_values: Map<string, string>
  values: Map<
    string,
    {
      prop: string
      is_handled_prop: boolean
      value: string
      is_available_value: UndefinedOr<boolean>
      sanitized_value: UndefinedOr<string>
      is_fallback_value: UndefinedOr<boolean>
      is_default_value: UndefinedOr<boolean>
      available_values: NonNullable<ReturnType<Available_Values['get']>>
      default_value: ReturnType<Default_Values['get']>
    }
  >
}
export type HVs_Update = {
  ctx: {
    handled_props: Set<string>
    available_values: Map<string, Set<string>>
    default_values: Map<string, string>
  }
  values: Map<
    string,
    {
      prop: string
      is_handled: boolean
      current: { value: Nullable<string>; was_available: UndefinedOr<boolean> }
      provided: { value: Nullable<string>; was_available: UndefinedOr<boolean>; was_same: UndefinedOr<boolean> }
      updated: { value: UndefinedOr<string>, is_same: UndefinedOr<boolean>, is_default: UndefinedOr<boolean>, is_fallback: UndefinedOr<boolean>}
      was_provided: boolean
      got_updated: UndefinedOr<boolean>
      available_values: NonNullable<ReturnType<Available_Values['get']>>
      default_value: ReturnType<Default_Values['get']>
    }
  >
  performed_update: boolean
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