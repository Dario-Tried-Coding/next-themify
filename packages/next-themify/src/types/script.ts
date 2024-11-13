import { Config, Prop } from '.'
import { COLOR_SCHEMES, Color_Scheme as CS, MODES, STATIC, STRATS } from '../constants'

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
  provided_SC: SC
  is_same: boolean
}

export type SM_Validation = {
  valid: boolean
  SM: string
  performed_on: string | undefined | null
  available_values: NonNullable<Available_Values['mode']>
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

export type TA_Validation = {
  valid: boolean
  value: string
  performed_on: [Prop, string | undefined | null]
  available_values: Set<string>
}
export type Set_TAs_Info = {
  [key in keyof SC]: {
    must_update: boolean
    retrieved_TA: TA_Validation
    provided_value: string
    is_same: boolean
  }
}
