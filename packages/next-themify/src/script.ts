import { Color_Scheme as CS } from './constants'
import { Custom_Mode_Strat, Prop } from './types/index'
import {
  Available_Values,
  CS_Validation,
  SC,
  SC_Validation,
  Script_Params,
  Set_CS_Info,
  Set_SC_Info,
  Set_SM_Info,
  Set_TAs_Info,
  SM_Validation,
  TA_Validation,
} from './types/script'

export function script(params: Script_Params) {
  const html = document.documentElement

  const {
    config_SK,
    mode_SK,
    config,
    constants: { STRATS, MODES, COLOR_SCHEMES },
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

    const edited_obj = { ...parsed_obj }
    const results: SC_Validation['results'] = {}
    let valid = true

    for (const [unsafe_prop, unsafe_value] of Object.entries(edited_obj)) {
      if (!props_to_handle.includes(unsafe_prop as Prop)) {
        results[unsafe_prop] = [unsafe_value, false]
        delete edited_obj[unsafe_prop]
        valid = false
        continue
      }

      const prop_to_handle = unsafe_prop as Prop
      const is_available_value = available_values[prop_to_handle]?.has(unsafe_value)
      if (!is_available_value) {
        results[prop_to_handle] = [unsafe_value, false]
        edited_obj[prop_to_handle] = fallback_SC[prop_to_handle]
        valid = false
        continue
      }

      const available_value = unsafe_value as string
      results[prop_to_handle] = [available_value, true]
    }

    for (const prop of props_to_handle) {
      if (prop in edited_obj) continue
      edited_obj[prop] = fallback_SC[prop]
      valid = false
    }

    const SC_to_return = edited_obj as SC
    return { SC: SC_to_return, valid, results, performed_on: { string: unsafe_string, obj: parsed_obj }, available_values }
  }

  const get_SC = (opts?: { fallback_SC?: SC }): SC_Validation => {
    const storage_string = localStorage.getItem(config_SK)
    const validation = validate_SC(storage_string, opts)
    return validation
  }

  const set_SC = (SC: SC, opts?: { force?: boolean }): Set_SC_Info => {
    const retrieved_SC = get_SC()

    const is_same = isSameObj(retrieved_SC.SC, SC)
    if (retrieved_SC.valid && is_same && !opts?.force) return { must_update: false, retrieved_SC, provided_SC: SC, is_same }

    localStorage.setItem(config_SK, JSON.stringify(SC))
    return { must_update: true, retrieved_SC, provided_SC: SC, is_same }
  }

  // #endregion

  // #region STORAGE MODE (SM) -----------------------------------------------------------------------------------------

  const validate_SM = (SM: string | undefined | null, opts?: { fallback_SM?: string }): SM_Validation => {
    if (!config.mode || !available_values.mode || !default_values.mode) {
      warn('Func: validate_CM - trying to validate color mode but "mode" prop is missing from the config object.', config)
      return { valid: false, SM: '', performed_on: SM, available_values: new Set([]) }
    }

    const fallback_SM = opts?.fallback_SM ?? default_values.mode
    const available_SMs = available_values.mode

    if (!SM) return { valid: false, SM: fallback_SM, performed_on: SM, available_values: available_SMs }

    const is_SM_valid = available_SMs.has(SM)
    if (!is_SM_valid) return { valid: false, SM: fallback_SM, performed_on: SM, available_values: available_SMs }

    return { valid: true, SM, performed_on: SM, available_values: available_SMs }
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
    if (!config.mode)
      warn(
        'Func: get_SM - trying to retrieve and validate "color mode" from local storage but "mode" prop is missing from the config object.',
        config
      )
    const unsafe_string = localStorage.getItem(mode_SK)
    return validate_SM(unsafe_string)
  }

  const set_SM = (SM: string, opts?: { force?: boolean }): Set_SM_Info => {
    if (!config.mode) warn('Func: set_SM - trying to store "color mode" in local storage but "mode" prop is missing from the config object.', config)
    const retrieved_SM = get_SM()

    const is_same = retrieved_SM.SM === SM

    if (retrieved_SM.valid && is_same && !opts?.force) return { must_update: false, retrieved_SM, provided_SM: SM, is_same }

    localStorage.setItem(mode_SK, SM)
    return { must_update: true, retrieved_SM, provided_SM: SM, is_same }
  }

  // #endregion

  // #region COLOR SCHEME (SC) -----------------------------------------------------------------------------------------

  const get_CSPref = () => {
    if (!config.mode) {
      warn('Func: get_CSPref - trying to get color scheme preference but "mode" prop is missing from the config object.', config)
      return undefined
    }

    if (!window.matchMedia || !window.matchMedia('(prefers-color-scheme)').matches) return undefined
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? MODES.dark : MODES.light
  }

  const construct_CSs = () => {
    if (!config.mode) {
      warn('Func: construct_CSs - trying to construct color schemes but "mode" prop is missing from the config object.', config)
      return {}
    }

    const CSs: Record<string, CS> = {}
    if (config.mode.strategy === STRATS.mono) CSs[config.mode.key] = config.mode.colorScheme
    else if (config.mode.strategy === STRATS.custom) config.mode.keys.forEach((i) => (CSs[i.key] = i.colorScheme))
    else
      Object.entries(config.mode.keys).forEach(([key, value]) => {
        if (typeof value === 'string') CSs[key] = value as CS
        else value.forEach((i) => (CSs[i.key] = i.colorScheme))
      })

    return CSs
  }

  const validate_CS = (CS: string | undefined | null, opts?: { fallback_CS?: CS }): CS_Validation => {
    if (!config.mode) {
      warn('Func: validate_CS - trying to validate color scheme but "mode" prop is missing from the config object.', config)
      return { valid: false, CS: '', performed_on: CS, avalable_values: new Set(COLOR_SCHEMES) }
    }

    let fallback_CS: CS = COLOR_SCHEMES[0]

    if (config.mode.strategy === STRATS.mono) fallback_CS = config.mode.colorScheme
    else if (config.mode.strategy === STRATS.custom)
      fallback_CS = config.mode.keys.find((i) => i.key === (config as Custom_Mode_Strat<string[]>).default)?.colorScheme as CS
    else if (config.mode.strategy === STRATS.light_dark) {
      if (config.mode.default === config.mode.keys.light) fallback_CS = COLOR_SCHEMES[0]
      if (config.mode.default === config.mode.keys.dark) fallback_CS = COLOR_SCHEMES[1]
      if (config.mode.enableSystem && config.mode.default === config.mode.keys.system) {
        let config_fallback_CS: CS = COLOR_SCHEMES[0]

        if (config.mode.fallback === config.mode.keys.light) config_fallback_CS = COLOR_SCHEMES[0]
        if (config.mode.fallback === config.mode.keys.dark) config_fallback_CS = COLOR_SCHEMES[1]

        const is_custom_fallback = config.mode.keys.custom?.some(
          (i) => i.key === (config.mode?.strategy === 'light_dark' && config.mode.enableSystem && config.mode.fallback)
        )
        if (is_custom_fallback)
          config_fallback_CS = config.mode.keys.custom?.find(
            (i) => i.key === (config.mode?.strategy === 'light_dark' && config.mode.enableSystem && config.mode.fallback)
          )?.colorScheme as CS

        fallback_CS = config_fallback_CS
      }
    }

    if (!CS) return { valid: false, CS: fallback_CS, performed_on: CS, avalable_values: new Set(COLOR_SCHEMES) }

    const is_valid_CS = COLOR_SCHEMES.includes(CS as CS)
    if (!is_valid_CS) return { valid: false, CS: fallback_CS, performed_on: CS, avalable_values: new Set(COLOR_SCHEMES) }

    return { valid: true, CS: CS as CS, performed_on: CS, avalable_values: new Set(COLOR_SCHEMES) }
  }

  const get_CS = (opts?: { fallback_CS?: CS }): CS_Validation => {
    if (!config.mode) warn('Func: get_CS - trying to get color scheme but "mode" prop is missing from the config object.', config)

    const retrieved_CS = html.style.colorScheme
    return validate_CS(retrieved_CS, { fallback_CS: opts?.fallback_CS })
  }

  const set_CS = (CS: CS, opts?: { force?: boolean }): Set_CS_Info => {
    if (!config.mode)
      warn('Func: set_CS - trying to set "color scheme" style attribute on html element but "mode" prop is missing from the config object.', config)

    const retrieved_CS = get_CS()

    const is_same = retrieved_CS.CS === CS
    if (retrieved_CS.valid && is_same && !opts?.force) return { must_update: false, retrieved_CS, provided_CS: CS, is_same }

    html.style.colorScheme = CS
    return { must_update: true, retrieved_CS, provided_CS: CS, is_same }
  }

  const resolve_CS = (SM: string) => {
    if (!config.mode) warn('Func: resolve_CS - trying to resolve color scheme but "mode" prop is missing from the config object.', config)

    if (!available_values.mode?.has(SM))
      warn('Func: resolve_CS - trying to resolve color scheme but the provided "color mode" is not valid.', { SM, config })

    const CSs = construct_CSs()

    if (config.mode?.strategy === STRATS.mono && SM === config.mode.key) return config.mode.colorScheme
    else if (config.mode?.strategy === STRATS.custom && config.mode.keys.find((i) => i.key === SM))
      return config.mode.keys.find((i) => i.key === SM)?.colorScheme as CS
    else if (config.mode?.strategy === STRATS.light_dark) {
      if (SM === config.mode.keys.light) return COLOR_SCHEMES[0]
      else if (SM === config.mode.keys.dark) return COLOR_SCHEMES[1]
      else if (config.mode.enableSystem && SM === config.mode.keys.system) {
        const fallback_CS = CSs[config.mode.fallback] as CS
        return get_CSPref() ?? fallback_CS
      } else return COLOR_SCHEMES[0]
    } else return COLOR_SCHEMES[0]
  }

  // #endregion

  // #region THEME ATTRIBUTES (TA) -----------------------------------------------------------------------------------------
  const validate_TA = (TA: [Prop, string | undefined | null], opts?: { fallback_value?: string }): TA_Validation => {
    const [prop, value] = TA

    if (!default_values[prop] || !available_values[prop]) {
      warn("Func: validate_TA - trying to validate a theme attribute that's not enabled in the config object.", { theme_attribute: prop, config })
      return { valid: false, value: '', performed_on: TA, available_values: new Set([]) }
    }

    const fallback_value = opts?.fallback_value ?? default_values[prop]

    if (!value) return { valid: false, value: fallback_value, performed_on: TA, available_values: available_values[prop] }

    const is_valid_value = available_values[prop].has(value)
    if (!is_valid_value) return { valid: false, value: fallback_value, performed_on: TA, available_values: available_values[prop] }

    return { valid: true, value, performed_on: TA, available_values: available_values[prop] }
  }

  const get_TA = (prop: Prop, opts?: { fallback_value?: string }): TA_Validation => {
    const name = `data-${prop}`
    const retrieved_TA = html.getAttribute(name)
    return validate_TA([prop, retrieved_TA], { fallback_value: opts?.fallback_value })
  }

  const set_TAs = (SC: SC, opts?: { force?: boolean }): Set_TAs_Info => {
    const info: Set_TAs_Info = {}

    for (const [prop, value] of Object.entries(SC)) {
      const typed_prop = prop as keyof typeof SC
      const TA_name = `data-${typed_prop}` as const

      const retrieved_TA = get_TA(typed_prop)

      const is_same = retrieved_TA.value === value

      if (retrieved_TA.valid && retrieved_TA.value === value && !opts?.force) {
        info[typed_prop] = { must_update: false, retrieved_TA, provided_value: value, is_same }
        continue
      }

      html.setAttribute(TA_name, value)
      info[typed_prop] = { must_update: true, retrieved_TA, provided_value: value, is_same }
    }

    return info
  }

  // #endregion

  // #region CLASS NAME (CN) -------------------------------------------------------------------------------------------

  const toggle_CN = (CN: CS) => {
    html.classList.toggle(CN, CN === 'dark')
    html.classList.toggle(CN, CN === 'light')
  }

  // #endregion

  // #region INITIALIZATION --------------------------------------------------------------------------------------------

  const apply_SC = (SC: SC, opts?: { store?: boolean }) => {
    set_TAs(SC)
    if (opts?.store) set_SC(SC)
  }

  const apply_SM = (SM: string, opts?: { store?: boolean }) => {
    const resolved_CS = resolve_CS(SM)
    set_CS(resolved_CS)
    toggle_CN(resolved_CS)
    if (opts?.store) set_SM(SM)
  }

  const init = () => {
    const current_SC = get_SC()
    apply_SC(current_SC.SC, { store: !current_SC.valid })

    if (config.mode) {
      const current_SM = get_SM()
      apply_SM(current_SM.SM, { store: !current_SM.valid })
    }
  }

  init()

  // #endregion
}
