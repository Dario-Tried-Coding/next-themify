import { Config } from '.'
import { Color_Scheme, COLOR_SCHEMES, MODES, STATIC, STRATS } from '../constants'
import { Nullable, UndefinedOr } from './utils'

export type Script_Params = {
  config_SK: string
  mode_SK: string
  custom_SEK: string
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

type Ctx = {
  handled_props: Set<string>
  available_values: Map<string, Set<string>>
  default_values: Map<string, string>
}

export type Value_Sanitization = {
  prop: { prop: string; is_handled: boolean }
  available_values: Set<string>
  default_value: UndefinedOr<string>
  fallback_value: { is_provided: boolean; candidate: UndefinedOr<string>; is_available: UndefinedOr<boolean>; is_resolved: UndefinedOr<boolean>; resolved: UndefinedOr<string> }
  candidate_value: { is_provided: boolean; value: Nullable<string>; is_available: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean>; is_default: UndefinedOr<boolean> }
  sanitized_value: { value: UndefinedOr<string>; is_reverted: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean>; is_default: UndefinedOr<boolean> }
}
export type Values_Sanitization = {
  ctx: Ctx
  performed_on: {
    values: Map<string, string>
    are_ready_to_use: boolean
  }
  values: {
    sanitization: Map<string, Value_Sanitization>
    missing: Map<string, string>
    handled: Map<string, string>
    not_handled: Map<string, string>
  }
}
export type Value_Update_Report = Omit<Value_Sanitization, 'candidate_value' | 'sanitized_value' | 'fallback_value'> & {
  fallback_value: UndefinedOr<string>
  old_value: { is_provided: boolean; value: Nullable<string>; is_available: UndefinedOr<boolean>; is_default: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean> }
  new_value: { is_provided: boolean; value: Nullable<string>; is_available: UndefinedOr<boolean>; is_default: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean>; is_same: UndefinedOr<boolean> }
  updated_value: { value: UndefinedOr<string>; is_reverted: UndefinedOr<boolean>; is_default: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean>; is_same: UndefinedOr<boolean>; was_updated: boolean }
}
export type Values_Update = {
  ctx: Ctx
  values: {
    report: Map<string, Value_Update_Report>
    candidates: {
      values: Map<string, Nullable<string>>
      missing: Set<string>
      not_handled: Map<string, string>
      not_available: Map<string, Nullable<string>>
    }
    previous: {
      values: Map<string, string>
      missing: Set<string>
      not_handled: Map<string, string>
      not_available: Map<string, Nullable<string>>
    }
    resolved: {
      values: Map<string, UndefinedOr<string>>
      pruned: Map<string, string>
      updated: Map<string, UndefinedOr<string>>
      not_updated: Map<string, string>
    }
  }
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
  updated: { mode: UndefinedOr<string>; is_same: UndefinedOr<boolean>; is_default: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean> }
  available_modes: NonNullable<ReturnType<Available_Values['get']>>
  default_mode: ReturnType<Default_Values['get']>
  performed_update: boolean
}

export type CS_Sanitization = {
  is_mode_handled: boolean
  mode: Omit<SM_Sanitization, 'is_handled'>
  CS: { value: Nullable<string>; correct_CS: UndefinedOr<Color_Scheme>; is_correct: UndefinedOr<boolean>; is_resolved: UndefinedOr<boolean> }
}
export type CS_Update = {
  is_mode_handled: boolean
  mode: Omit<SM_Sanitization, 'is_handled'>
  current: { value: Nullable<string>; is_correct: UndefinedOr<boolean>; is_resolved: UndefinedOr<boolean> }
  updated: { CS: UndefinedOr<Color_Scheme>; is_same: UndefinedOr<boolean>; is_resolved: UndefinedOr<boolean> }
  correct_CS: UndefinedOr<Color_Scheme | Color_Scheme[]>
  performed_update: boolean
}

export type Custom_SE = CustomEvent<{
  key: string
  newValue: Nullable<string>
  oldValue: Nullable<string>
}>
