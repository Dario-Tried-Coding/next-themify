import { Config } from '.'
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

export type Handled_Values = Map<string, string>
type Default_Values = Map<string, string>
type Available_Values = Map<string, Set<string>>

export type HVs_Sanitization = {
  ctx: {
    handled_props: Set<string>
    available_values: Map<string, Set<string>>
    default_values: Map<string, string>
  }
  performed_on: Map<string, string>
  are_proper_values: boolean
  values: {
    processed: Map<
      string,
      {
        prop: { prop: string; is_handled: boolean }
        value: { value: string; is_available: UndefinedOr<boolean>; sanitized: UndefinedOr<string>; is_fallback: UndefinedOr<boolean>; default: UndefinedOr<string>; is_default: UndefinedOr<boolean> }
        available_values: NonNullable<ReturnType<Available_Values['get']>>
      }
    >
    missing: Map<string, string>
    handled: Map<string, string>
    not_handled: Map<string, string>
  }
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
      prop: { prop: string; is_handled: boolean; is_provided: boolean }
      value: {
        current: { value: Nullable<string>; is_available: UndefinedOr<boolean> }
        provided: { value: Nullable<string>; is_available: UndefinedOr<boolean>; is_default: UndefinedOr<boolean>; is_same: UndefinedOr<boolean> }
        updated: { value: UndefinedOr<string>; is_same: UndefinedOr<boolean>; is_default: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean> }
        default: ReturnType<Default_Values['get']>
      }
      available_values: NonNullable<ReturnType<Available_Values['get']>>
    }
  >
  performed_update: boolean
}

export type SM_Sanitization = {
  is_handled: boolean
  value: Nullable<string>
  is_available: UndefinedOr<boolean>
  sanitized_mode: UndefinedOr<string>
  is_fallback: UndefinedOr<boolean>
  is_default: UndefinedOr<boolean>
  is_system: UndefinedOr<boolean>
  available_modes: NonNullable<ReturnType<Available_Values['get']>>
  default_mode: ReturnType<Default_Values['get']>
}
export type SM_Update = {
  is_handled: boolean
  current: { value: Nullable<string>; is_available: UndefinedOr<boolean> }
  provided: { value: Nullable<string>; is_available: UndefinedOr<boolean>; is_default: UndefinedOr<boolean>; is_same: UndefinedOr<boolean> }
  updated: { mode: UndefinedOr<string>; is_same: UndefinedOr<boolean>, is_default: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean> }
  available_modes: NonNullable<ReturnType<Available_Values['get']>>
  default_mode: ReturnType<Default_Values['get']>
  performed_update: boolean
}

export type CS_Sanitization = {
  is_mode_handled: boolean
  mode: Omit<SM_Sanitization, 'is_handled'>
  CS: { value: Nullable<string>; correct_CS: UndefinedOr<Color_Scheme>; is_correct: UndefinedOr<boolean>, is_resolved: UndefinedOr<boolean> }
}
export type CS_Update = {
  is_mode_handled: boolean
  mode: Omit<SM_Sanitization, 'is_handled'>
  current: { value: Nullable<string>; is_correct: UndefinedOr<boolean>, is_resolved: UndefinedOr<boolean> }
  updated: { CS: UndefinedOr<Color_Scheme>; is_same: UndefinedOr<boolean>; is_resolved: UndefinedOr<boolean> }
  correct_CS: UndefinedOr<Color_Scheme | Color_Scheme[]>
  performed_update: boolean
}
