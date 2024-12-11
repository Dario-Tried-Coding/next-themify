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
  preferred_values: Map<string, string>
}

export type Value_Sanitization = {
  prop: { prop: string; is_handled: boolean }
  available: Set<string>
  preferred: UndefinedOr<string>
  candidate_fallback: { is_provided: boolean; value: UndefinedOr<string>; is_available: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean> }
  fallback: { value: UndefinedOr<string>; is_reverted: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean> }
  candidate: { is_provided: boolean; value: Nullable<string>; is_available: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean> }
  sanitized: { value: UndefinedOr<string>; is_reverted: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean> }
}
export type Values_Sanitization = {
  ctx: Ctx
  performed_on: Map<string, string>
  are_ready_to_use: boolean
  sanitization: Map<string, Value_Sanitization>
}

export type Value_Update_Report = Omit<Value_Sanitization, 'candidate' | 'sanitized' | 'candidate_fallback' | 'fallback'> & {
  previous: { is_provided: boolean; value: Nullable<string>; is_available: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean> }
  fallback: { value: UndefinedOr<string>; is_reverted: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean> }
  candidate: { is_provided: boolean; value: Nullable<string>; is_available: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean> }
  next: { value: UndefinedOr<string>; is_preferred: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean>; is_updated: UndefinedOr<boolean>; is_reverted: UndefinedOr<boolean> }
}
export type Values_Update_Report = {
  ctx: Ctx
  report: Map<string, Value_Update_Report>
  values: {
    candidates: Map<string, string>
    candidates_unavailable: Map<string, string>
    candidates_implicit: Map<string, string>
    candidates_ignored: Map<string, string>
    previous: Map<string, string>
    previous_unavailable: Map<string, string>
    previous_missing: Set<string>
    previous_pruned: Map<string, string>
    resolved: Map<string, string>
    updated: Map<string, UndefinedOr<string>>
    stale: Map<string, string>
    reverted: Map<string, UndefinedOr<string>>
  }
  did_update: boolean
  did_reverte: boolean
  did_execute: boolean
}

export type SM_Sanitization = {
  is_handled: boolean
  available: Set<string>
  preferred: UndefinedOr<string>
  candidate_fallback: { is_provided: boolean; value: Nullable<string>; is_available: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean>; is_system: UndefinedOr<boolean> }
  fallback: { value: UndefinedOr<string>; is_resolved: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean>; is_system: UndefinedOr<boolean> }
  candidate: { value: Nullable<string>; is_available: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean>; is_system: UndefinedOr<boolean> }
  sanitized: { value: UndefinedOr<string>; is_reverted: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean>; is_system: UndefinedOr<boolean> }
}
export type SM_Update = Pick<SM_Sanitization, 'is_handled' | 'available' | 'preferred' | 'fallback'> & {
  previous: SM_Sanitization['candidate_fallback']
  candidate: { value: Nullable<string>; is_available: UndefinedOr<boolean>; is_preferred: UndefinedOr<boolean>; is_fallback: UndefinedOr<boolean> }
  next: SM_Sanitization['sanitized'] & { is_updated: boolean; is_stale: UndefinedOr<boolean> }
  did_execute: boolean
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
