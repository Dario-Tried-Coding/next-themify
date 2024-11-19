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
export type Fallback_Values = Map<Prop, string>
export type Available_Values = Map<Prop, Set<string>>
export type Mode_CSs = Map<string, CS>

export type Storage_Values_Sanitization = {
  results: UndefinedOr<Map<string, { prop: Nullable<string>; is_handled: boolean; value: Nullable<string>; valid: boolean }>>
  valid: boolean
  sanitized_values: Storage_Values
  fallback_values: Fallback_Values
  available_values: Available_Values
  handled_props: Handled_Props
  performed_on: Nullable<string> | Map<string, string>
}
export type Set_Storage_Values = {
  info: Map<
    Prop,
    {
      retrieved_value: Nullable<string>
      provided_value: string
      available_values: NonNullable<ReturnType<Available_Values['get']>>
      was_valid: boolean
      is_same: boolean
      updated: boolean
    }
  >
} & ({ updated: true; updated_with: Storage_Values } | { updated: false; sticked_with: Storage_Values })

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
    received_TA: { prop: Prop; value: string }
  }
>

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
