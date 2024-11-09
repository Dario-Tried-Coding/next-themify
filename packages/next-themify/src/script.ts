import { Custom_Strat, Light_Dark_Strat, Mono_Strat, Multi_Strat, Prop } from './types/index'
import { Available_Values, CM_Validation, SC_Validation, Script_Params, Set_SC_Info, SC } from './types/script'

export function script(params: Script_Params) {
  const html = document.documentElement

  const {
    config_SK,
    mode_SK,
    config,
    constants: { STRATS, MODES },
  } = params

  let init_library = true

  const props_to_handle = Object.keys(config) as Prop[] // ONLY the props that Next-Themify must handle (based on config obj)
  const available_values = construct_available_values() // All the available values of ONLY the props that Next-Themify must handle (based on config obj)
  const default_values = construct_default_values() // Default value of ONLY the props that Next-Themify must handle (based on config obj)

  // #region HELPERS --------------------------------------------------------------------------

  function capitalize(str: string) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  /** Parses a JSON string and returns the corresponding object if valid. */
  function parse_JsonToObj(string: string | undefined | null): object | undefined {
    if (typeof string !== 'string' || string.trim() === '') return undefined

    try {
      const result = JSON.parse(string)
      return typeof result === 'object' && result !== null && !Array.isArray(result) ? result : undefined
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

  /** Stops the library from getting initialized if something is wrong. */
  function warn(msg: string, ...args: any[]) {
    console.warn(`[next-themify] ${msg}`, ...args)
    init_library = false
  }

  /** Constructs an object ONLY containing the available values ONLY for each of the props provided in the config obj. */
  function construct_available_values() {
    const available_values: Available_Values = {}

    for (const [key, strat_obj] of Object.entries(config)) {
      const typed_key = key as keyof typeof available_values

      if (strat_obj.strategy === 'mono') available_values[typed_key] = new Set([strat_obj.key])
      else if (strat_obj.strategy === 'light_dark') {
        const keys = Object.values(strat_obj.keys)
          .flat()
          .map((i) => (typeof i === 'string' ? i : i.key))
        available_values[typed_key] = new Set(Object.values(keys))
      } else if (strat_obj.strategy === 'custom') available_values[typed_key] = new Set(strat_obj.keys.map((i) => i.key))
      else available_values[typed_key] = new Set(strat_obj.keys)
    }

    return available_values
  }

  /** Constructs an object containing the default value to use for each of the props provided in the config obj. */
  function construct_default_values() {
    const default_values: SC = {}

    for (const [key, value] of Object.entries(config)) {
      const typed_key = key as keyof typeof default_values

      if (value.strategy === STRATS.mono) default_values[typed_key] = value.key
      else default_values[typed_key] = value.default
    }

    return default_values
  }

  // #endregion

  // #region STORAGE CONFIG (SC) -----------------------------------------------------------------------------------------

  /**
   * It returns a Storage Config (SC) object with ONLY the props that Next-Themify must handle (based on the config obj).
   *
   * - Props' values: stringified value (if provided and valid) -> fallback value: provided (if provided and valid) or default (based on config obj)
   * - If not valid stringified obj -> fallback values (provided or default)
   * - Missing props (if missing) -> fallback values (provided or default)
   */
  function validate_SC(unsafe_string: string | undefined | null, opts?: {fallback_SC?: SC}): SC_Validation {
    const parsed_obj = parse_JsonToObj(unsafe_string) // Parse the string to an object (if proper stringified obj)

    const fallback_SC = default_values // ONLY props_to_handle -> values: provided (if provided and valid) || default

    // If opts.fallback_SC is provided -> override each prop_to_handle default value with provided fallback (if provided and valid)
    if (opts?.fallback_SC) {
      for (const key of props_to_handle) {
        const override_fallback = opts.fallback_SC[key]
        const is_valid_fallback = override_fallback && available_values[key]?.has(override_fallback)
        if (is_valid_fallback) fallback_SC[key] = override_fallback
      }
    }

    if (!parsed_obj) return { SC: fallback_SC, valid: false, results: {}, performed_on: { string: unsafe_string, obj: parsed_obj }, available_values }

    const SC_to_return: SC = {} // ONLY props_to_handle -> provided values (if provided and valid) || fallback values: provided (if provided and valid) || default (based on config obj)
    const results: SC_Validation['results'] = {}

    let valid = true

    for (const [prop, value_to_validate] of Object.entries(parsed_obj)) {
      // If not prop_to_handle -> DO NOT record value, record value's validity and skip to the next prop
      if (!props_to_handle.includes(prop as Prop)) {
        results[prop] = [value_to_validate, false]
        valid = false
        continue
      }

      // If prop_to_handle... continue
      const prop_to_handle = prop as Prop
      const is_available_value = available_values[prop_to_handle]?.has(value_to_validate)
      
      // If not available_value -> record fallback value, value's validity and skip to the next prop
      if (!is_available_value) {
        SC_to_return[prop_to_handle] = fallback_SC[prop_to_handle]
        results[prop_to_handle] = [value_to_validate, false]
        valid = false
        continue
      }

      // If available_value -> record value, value's validity and skip to the next prop
      SC_to_return[prop_to_handle] = value_to_validate
      results[prop_to_handle] = [value_to_validate, true]
    }

    // If missing some prop_to_handle -> use fallback values (provided or default)
    for (const prop of props_to_handle) {
      if (prop in SC_to_return) continue
      SC_to_return[prop] = fallback_SC[prop]
    }

    return { SC: SC_to_return, valid, results, performed_on: { string: unsafe_string, obj: parsed_obj }, available_values }
  }

  /**
   * It retrieves and validates the SC object from the local storage.
   * - If no/invalid/incomplete SC -> fallback values (provided or default)
   */
  function get_SC(opts?: {fallback_SC?: SC}): SC_Validation {
    const storage_string = localStorage.getItem(config_SK) // Retrieve WHATEVER is stored in the device local storage (if present)
    const validation = validate_SC(storage_string, opts) // Validate whatever is retrieved from the local storage
    return validation
  }

  /**
   * It sets/updates the SC with the provided new values.
   * - If valid both new & old -> execute only if needed (if the two are different)
   */
  function set_SC(SC: SC, opts?: { force?: boolean}):Set_SC_Info {
    const retrieved_SC = get_SC()
    const provided_SC = validate_SC(JSON.stringify(SC))

    const SC_to_set = { ...retrieved_SC.SC } // ONLY props_to_handle -> values: retrieved or default

    // Give SC_to_set the new values from provided_SC (if valid & only the required props)
    for (const key of props_to_handle) {
      const is_valid = provided_SC.results[key]?.[1]
      if (is_valid) SC_to_set[key] = provided_SC.SC[key]
    }

    const is_same = isSameObj(retrieved_SC.SC, SC_to_set)
    const must_update = opts?.force || !retrieved_SC.valid || (retrieved_SC.valid && !is_same)

    const return_info = { must_update, retrieved_SC, provided_SC, is_same }

    if (!must_update) return return_info

    localStorage.setItem(config_SK, JSON.stringify(SC_to_set))
    return return_info
  }

  // #endregion

  // #region COLOR MODE (CM) -----------------------------------------------------------------------------------------

  /**
   * It checks if the provided string is a valid color mode.
   * - If "mode" prop not enabled -> forcebly invalid (no matter what).
   * - If invalid -> fallback value (if provided and valid) or the "default" value.
   */
  function validate_CM(CM: string | undefined | null, opts?: {fallback_CM?: string}): CM_Validation {
    // If "mode" not enabled -> forcebly invalid
    if (!config.mode || !available_values.mode || !default_values.mode) {
      warn('Func: validate_CM - trying to validate color mode but "mode" prop is missing from the config object.', config)

      return { passed: false, CM: undefined, performed_on: CM, available_values: new Set([]) }
    }

    const available_modes = available_values.mode

    // If "fallback" is provided, check if it's a valid value
    const is_fallback_valid = typeof opts?.fallback_CM === 'string' && available_modes.has(opts.fallback_CM)
    
    if (!is_fallback_valid)
      warn('Func: validate_CM - the provided "fallback" value is not valid... using "default" value as "fallback"', {
        provided: opts?.fallback_CM,
        available_values: available_modes,
        default: default_values.mode,
      })

    const fallback_CM = is_fallback_valid ? opts.fallback_CM : default_values.mode

    if (!CM) return { passed: false, CM: fallback_CM, performed_on: CM, available_values: available_modes }

    const passed = available_modes.has(CM)
    if (!passed) return { passed: false, CM: fallback_CM, performed_on: CM, available_values: available_modes }

    return { passed: true, CM, performed_on: CM, available_values: available_modes }
  }

  /**
   * It decides between the "light" and "dark" color scheme based on the system preference.
   *
   * If the browser doesn't support the "prefers-color-scheme" media query, it will return the fallback value.
   *
   * It executes only if:
   * - "mode" prop is enabled in the config obj
   * - "mode.strategy" is set to "light_dark"
   * - "mode.enableSystem" is set to true
   */
  function resolve_CM() {
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

  // #endregion

  // #region COLOR SCHEME (SC) -----------------------------------------------------------------------------------------

  function get_CSPref() {
    if (!window.matchMedia || !window.matchMedia('(prefers-color-scheme)').matches) return undefined
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? MODES.dark : MODES.light
  }

  // #endregion

  console.log('hi from script')
}
