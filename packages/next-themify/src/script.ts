import { Custom_Strat, Light_Dark_Strat, Mono_Strat, Multi_Strat, Prop } from './types/index'
import { Available_Values, SM_Validation, SC_Validation, Script_Params, Set_SC_Info, SC, Set_SM_Info, CS_Validation } from './types/script'
import { Color_Scheme as CS } from './constants'

export function script(params: Script_Params) {
  const html = document.documentElement

  const {
    config_SK,
    mode_SK,
    config,
    constants: { STRATS, MODES },
  } = params

  let init_library = true

  // #region HELPERS --------------------------------------------------------------------------

  /** Parses a JSON string and returns the corresponding object if valid. */
  function parse_JsonToObj(string: string | undefined | null): Record<string, any> | undefined {
    if (typeof string !== 'string' || string.trim() === '') return undefined

    try {
      const result = JSON.parse(string)
      if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
        for (const key in result) {
          if (typeof key !== 'string') {
            return undefined
          }
        }
        return result
      }
    } catch (error) {
      return undefined
    }
  }

  /** Compares two objects to determine if they are the same. */
  function isSameObj(obj1: Record<string, any> | undefined | null, obj2: Record<string, any> | undefined | null) {
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false

    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length) return false

    for (const key of keys1) {
      const val1 = obj1[key]
      const val2 = obj2[key]

      const areObjects = typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null

      if ((areObjects && !isSameObj(val1, val2)) || (!areObjects && val1 !== val2)) return false
    }

    return true
  }

  // #endregion

  // #region UTILS ------------------------------------------------------------------------------------------------------

  const warn = (msg: string, ...args: any[]) => {
    console.warn(`[next-themify] ${msg}`, ...args)
    init_library = false
  }

  const construct_available_values = (): Available_Values => {
    const available_values: Available_Values = {}

    for (const [key, strat_obj] of Object.entries(config)) {
      const typed_key = key as keyof typeof available_values

      if (strat_obj.strategy === 'mono') available_values[typed_key] = new Set([strat_obj.key])
      else if (strat_obj.strategy === 'multi') available_values[typed_key] = new Set(strat_obj.keys)
      else if (strat_obj.strategy === 'custom') available_values[typed_key] = new Set(strat_obj.keys.map((i) => i.key))
      else if (strat_obj.strategy === 'light_dark')
        available_values[typed_key] = new Set(
          Object.values(strat_obj.keys)
            .flat()
            .map((i) => (typeof i === 'string' ? i : i.key))
        )
    }

    return available_values
  }

  const construct_default_values = (): SC => {
    const default_values: SC = {}

    for (const [key, value] of Object.entries(config)) {
      const typed_key = key as keyof typeof default_values

      if (value.strategy === STRATS.mono) default_values[typed_key] = value.key
      else default_values[typed_key] = value.default
    }

    return default_values
  }

  // #endregion

  const props_to_handle = Object.keys(config) as Prop[]
  const available_values = construct_available_values()
  const default_values = construct_default_values()

  // #region STORAGE CONFIG (SC) -----------------------------------------------------------------------------------------

  const merge_SCs = (...SCs: (SC | undefined)[]): SC => {
    const merged_SC: SC = {}

    for (const SC of SCs) {
      if (!SC) continue
      for (const prop of props_to_handle) {
        if (prop in SC) merged_SC[prop] = SC[prop]
      }
    }

    return merged_SC
  }

  const validate_SC = (unsafe_string: string | undefined | null, opts?: { fallback_SC?: SC }): SC_Validation => {
    const fallback_SC = merge_SCs(default_values, opts?.fallback_SC)

    const parsed_obj = parse_JsonToObj(unsafe_string)
    if (!parsed_obj) return { SC: fallback_SC, valid: false, results: {}, performed_on: { string: unsafe_string, obj: parsed_obj }, available_values }

    const results: SC_Validation['results'] = {}
    let valid = true

    for (const [unsafe_prop, unsafe_value] of Object.entries(parsed_obj)) {
      if (!props_to_handle.includes(unsafe_prop as Prop)) {
        results[unsafe_prop] = [unsafe_value, false]
        delete parsed_obj[unsafe_prop]
        valid = false
        continue
      }

      const prop_to_handle = unsafe_prop as Prop
      const is_available_value = available_values[prop_to_handle]?.has(unsafe_value)
      if (!is_available_value) {
        results[prop_to_handle] = [unsafe_value, false]
        parsed_obj[prop_to_handle] = fallback_SC[prop_to_handle]
        valid = false
        continue
      }

      const available_value = unsafe_value as string
      results[prop_to_handle] = [available_value, true]
    }

    for (const prop of props_to_handle) {
      if (prop in parsed_obj) continue
      parsed_obj[prop] = fallback_SC[prop]
    }

    const SC_to_return = parsed_obj as SC
    return { SC: SC_to_return, valid, results, performed_on: { string: unsafe_string, obj: parsed_obj }, available_values }
  }

  const get_SC = (opts?: { fallback_SC?: SC }): SC_Validation => {
    const storage_string = localStorage.getItem(config_SK)
    const validation = validate_SC(storage_string, opts)
    return validation
  }

  const set_SC = (SC: SC, opts?: { force?: boolean }): Set_SC_Info => {
    const retrieved_SC = get_SC()
    const provided_SC = validate_SC(JSON.stringify(SC), { fallback_SC: retrieved_SC.SC })

    const is_same = isSameObj(retrieved_SC.SC, provided_SC.SC)
    const must_update = opts?.force || !retrieved_SC.valid || (retrieved_SC.valid && !is_same)

    const return_info: Set_SC_Info = { must_update, retrieved_SC, provided_SC, is_same }

    if (!must_update) return return_info

    localStorage.setItem(config_SK, JSON.stringify(provided_SC.SC))
    return return_info
  }

  // #endregion

  // #region STORAGE MODE (SM) -----------------------------------------------------------------------------------------

  const validate_SM = (SM: string | undefined | null, opts?: { fallback_SM?: string }): SM_Validation => {
    if (!config.mode || !available_values.mode || !default_values.mode) {
      warn('Func: validate_CM - trying to validate color mode but "mode" prop is missing from the config object.', config)
      return { passed: false, SM: '', performed_on: SM, available_values: new Set([]) }
    }

    const fallback_SM = opts?.fallback_SM ?? default_values.mode
    const available_SMs = available_values.mode

    if (!SM) return {passed: false, SM: '', performed_on: SM, available_values: available_SMs}

    const is_SM_valid = available_SMs.has(SM)
    if (!is_SM_valid) return { passed: false, SM: fallback_SM, performed_on: SM, available_values: available_SMs }

    return { passed: true, SM, performed_on: SM, available_values: available_SMs }
  }

  const resolve_SM = () => {
    if (!config.mode || !available_values.mode || !default_values.mode) {
      warn('Func: resolve_CM - trying to resolve color scheme but "mode" prop is missing from the config object.', config)
      return undefined
    }

    if (config.mode.strategy !== STRATS.light_dark) {
      warn('Func: resolve_CM - trying to resolve color scheme but "mode" prop is not set to "light_dark" strategy.', config.mode)
      return undefined
    }

    if (!config.mode.enableSystem) {
      warn('Func: resolve_CM - trying to resolve color scheme but "mode.enableSystem" is set to false.', config.mode)
      return undefined
    }

    const CS_Pref = get_CSPref()
    if (!CS_Pref) return config.mode.fallback

    return CS_Pref === 'dark' ? config.mode.keys.dark : config.mode.keys.light
  }

  const get_SM = (): SM_Validation => {
    const unsafe_string = localStorage.getItem(mode_SK)
    return validate_SM(unsafe_string)
  }

  const set_SM = (SM: string, opts?: { force?: boolean }): Set_SM_Info => {
    const retrieved_SM = get_SM()
    const provided_SM = validate_SM(SM, { fallback_SM: retrieved_SM.SM })

    const is_same = retrieved_SM.SM === provided_SM.SM
    const must_update = opts?.force || !retrieved_SM.passed || (retrieved_SM.passed && !is_same)

    const info: Set_SM_Info = { must_update, retrieved_SM, provided_SM, is_same}

    if (!must_update) return info

    localStorage.setItem(mode_SK, provided_SM.SM)
    return info
  }

  // #endregion

  // #region COLOR SCHEME (SC) -----------------------------------------------------------------------------------------

  const get_CSPref = () => {
    if (!window.matchMedia || !window.matchMedia('(prefers-color-scheme)').matches) return undefined
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? MODES.dark : MODES.light
  }

  const validate_CS = (CS: string | undefined | null, opts?: {fallback_CS?: CS}): CS_Validation => {
    const asp = 'aspetta'
  }

  // #endregion

  console.log(get_SM())
}
