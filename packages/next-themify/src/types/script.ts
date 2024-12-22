import { Config } from '.'
import { Color_Scheme, COLOR_SCHEMES, STATIC, STRATS } from '../constants'
import { Nullable, NullOr, UndefinedOr } from './utils'

export type Script_Params = {
  storage_keys: {
    config_SK: string
    mode_SK: string
  }
  custom_SEK: string
  config: Config<STATIC>
  constants: {
    STRATS: typeof STRATS
    COLOR_SCHEMES: typeof COLOR_SCHEMES
  },
  transitions: {
    disable_on_change?: boolean
    nonce?: string
  }
}

export type Handled_Values = Map<string, string>

type Ctx = {
  handled_props: Set<string>
  available_values: Map<string, Set<string>>
  preferred_values: Map<string, string>
}

export type Value_Sanitization = {
  prop: { prop: string; is_handled: boolean }
  available: Set<string>
  preferred: UndefinedOr<string>
  candidate_fallback: { is_provided: boolean; value: Nullable<string> }
  fallback: { value: UndefinedOr<string>; is_reverted: UndefinedOr<boolean> }
  candidate: { is_provided: boolean; value: Nullable<string> }
  sanitized: { value: UndefinedOr<string>; is_reverted: UndefinedOr<boolean>, is_system?: UndefinedOr<boolean> }
}
export type Values_Sanitization = {
  performed_on: Map<string, NullOr<string>>
  are_ready_to_use: boolean
  sanitization: Map<string, Value_Sanitization>
}

export type Value_Change_Report = Pick<Value_Sanitization, 'prop' | 'available' | 'preferred'> & {
  previous: { is_provided: boolean; value: Nullable<string> }
  candidate: { value: Nullable<string> }
  current: { value: UndefinedOr<string>; is_updated: boolean; is_reverted: boolean }
  did_execute: boolean
}
export type Values_Change_Report = {
  report: Map<string, Value_Change_Report>
  current: Map<string, UndefinedOr<string>>
  did_update: boolean
  did_reverte: boolean
  did_execute: boolean
}

export type SM_Sanitization = Omit<Value_Sanitization, 'prop'> & {
  is_handled: boolean
}

export type RM_Sanitization = {
  is_mode_handled: boolean
  mode: SM_Sanitization['sanitized']
  candidate: { value: Nullable<string>; is_correct: UndefinedOr<boolean> }
  correct: { value: UndefinedOr<Color_Scheme>; is_reverted: UndefinedOr<boolean>; is_resolved: UndefinedOr<boolean> }
}
export type RM_Change_Report = Pick<RM_Sanitization, 'is_mode_handled' | 'mode'> & {
  previous: { value: Nullable<string>; is_correct: UndefinedOr<boolean> }
  candidate: { value: Nullable<string>; is_correct: UndefinedOr<boolean> }
  current: { value: UndefinedOr<Color_Scheme>; is_updated: boolean; is_reverted: UndefinedOr<boolean>; is_resolved: UndefinedOr<boolean> }
  did_execute: boolean
}

export type CS_Update = Pick<RM_Sanitization, 'is_mode_handled' | 'mode'> & {
  previous: { value: Nullable<string>; is_correct: UndefinedOr<boolean> }
  next: { value: UndefinedOr<Color_Scheme>; is_resolved: UndefinedOr<boolean>; is_updated: boolean }
  did_execute: boolean
}

export type Custom_SE = CustomEvent<{
  key: string
  newValue: NullOr<string>
  oldValue: NullOr<string>
}>

export type Mutation_Changes = Record<string, string[]>
