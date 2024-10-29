// @ts-check

/**
 * @typedef {import('./constants').STATIC} STATIC
 * @typedef {import('./constants').LIGHT} LIGHT
 * @typedef {import('./constants').DARK} DARK
 * @typedef {import('./types').Config<STATIC>} Config
 * @typedef {import('./types/script').Storage_Config} Storage_Config
 * @typedef {import('./types/index').Prop} Prop
 * @typedef {import('./types/index').Multi_Strat<string[]>} Multi_Strat
 * @typedef {import('./types/index').Custom_Mode_Strat<string[]>} Custom_Mode_Strat
 * @typedef {import('./types/index').Light_Dark_Mode_Strat<STATIC>} Light_Dark_Mode_Strat
 */

/** @param {import('./types/script').Script_Params} params */
export function script(params) {
  const html = document.documentElement
  const {
    config_SK,
    config,
    constants: { STRATS, MODES },
  } = params

  let init_library = true

  const valid_values = construct_valid_values()
  const default_SC = construct_default_SC()

  // #region HELPERS --------------------------------------------------------------------------
  /** @param {string} str */
  function capitalize(str) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  /**
   * Parses a JSON string and returns the corresponding object if valid.
   * @param {string | undefined | null} string - The JSON string to parse.
   * @returns {Record<string, any> | undefined} The parsed object if the input is a valid JSON object string, otherwise undefined.
   */
  function parse_JsonToObj(string) {
    if (typeof string !== 'string' || string.trim() === '') return undefined

    try {
      const result = JSON.parse(string)
      return typeof result === 'object' && result !== null && !Array.isArray(result) ? result : undefined
    } catch (error) {
      return undefined
    }
  }

  /**
   * Compares two objects to determine if they are the same.
   * @param {Record<string, any>} obj1 - The first object to compare.
   * @param {Record<string, any>} obj2 - The second object to compare.
   * @returns {boolean} `true` if the objects are the same, otherwise `false`.
   */
  function isSameObj(obj1, obj2) {
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

  // #region UTILS ----------------------------------------------------------------------------
  function construct_valid_values() {
    /** @type {Partial<Record<Prop, Set<string>>>} */
    const valid_values = {}

    for (const [key, value] of Object.entries(config)) {
      const typed_key = /** @type {Prop} */ (key)

      if (value.strategy === STRATS.mono) valid_values[typed_key] = new Set([value.key])
      else if (value.strategy === STRATS.light_dark) {
        valid_values[typed_key] = new Set([
          value.keys.light,
          value.keys.dark,
          ...(value.enableSystem ? [value.keys.system] : []),
          ...(value.keys.custom || []),
        ])
      } else valid_values[typed_key] = new Set(value.keys)
    }

    return valid_values
  }

  function construct_default_SC() {
    /** @type {Storage_Config} */
    const default_SC = {}

    for (const [key, value] of Object.entries(config)) {
      const typed_key = /** @type {Prop} */ (key)

      if (value.strategy === STRATS.mono) default_SC[typed_key] = value.key
      else default_SC[typed_key] = value.default
    }

    return default_SC
  }
  // #endregion

  // #region CONFIG VALIDATION ----------------------------------------------------------------
  /**
   * @param {string} msg
   * @param {any[]} args
   */
  function warn(msg, ...args) {
    console.warn(`[next-themify] ${msg}`, ...args)
    init_library = false
  }

  /**
   * @param {Multi_Strat | Custom_Mode_Strat} obj
   * @param {Prop} prop
   */
  const validate_multi_strat = (obj, prop) => {
    const is_valid = obj.keys.includes(obj.default)
    if (!is_valid) warn(`${capitalize(prop)} validation: "default" key must be one of the provided keys`)
  }

  /** @param {Light_Dark_Mode_Strat} obj */
  const validate_light_dark_mode_strat = (obj) => {
    if (obj.keys.light === obj.keys.dark)
      return warn('Func: validate_light_dark_mode_strat - "light" and "dark" keys must be different', {
        keys: { light: obj.keys.light, dark: obj.keys.dark },
      })
    if (obj.enableSystem && !obj.keys.system)
      return warn('Func: validate_light_dark_mode_strat - "system" key must be provided if "system" is enabled', { keys: obj.keys })
    if (obj.enableSystem && (obj.keys.system === obj.keys.light || obj.keys.system === obj.keys.dark))
      return warn('Func: validate_light_dark_mode_strat - "system" key must be different from "light" and "dark" keys', { keys: obj.keys })
    if (obj.keys.custom && obj.keys.custom.length === 0)
      return warn('Func: validate_light_dark_mode_strat - at least one "custom" key must be provided', { keys: obj.keys.custom })
    if (!valid_values['mode']?.has(obj.default))
      return warn('Func: validate_light_dark_mode_strat - "default" key must be one of the provided keys', { keys: obj.keys, default: obj.default })
    if (obj.enableSystem && obj.fallback === obj.keys.system)
      return warn('Func: validate_light_dark_mode_strat - "fallback" key must be different from "system" key', {
        keys: { system: obj.keys.system },
        fallback: obj.fallback,
      })
  }

  function validate_config() {
    for (const [key, strat_obj] of Object.entries(config)) {
      const typed_key = /** @type {Prop} */ (key)

      if (strat_obj.strategy === STRATS.mono) continue
      else if (strat_obj.strategy === STRATS.multi || strat_obj.strategy === STRATS.custom) validate_multi_strat(strat_obj, typed_key)
      else if (strat_obj.strategy === STRATS.light_dark) validate_light_dark_mode_strat(strat_obj)
    }
  }
  // #endregion

  // #region STORAGE CONFIG (SC) ----------------------------------------------------------------

  /**
   * @typedef {{fallback?: Storage_Config, verbose?: boolean}} SC_Opts The options object for the SC functions.
   * @typedef {{SC: Storage_Config, passed: boolean, validation_results?: Partial<Record<Prop, [string, boolean]>>}} SC_Validation The SC validation info.
   */

  /**
   * Safely parses and validates the received string, returning a valid SC (invalid keys are replaced with corresponding fallback/default theme's key) and a boolean indicating if the string validated successfully.
   * @param {Record<string, any> | undefined | null} obj_to_validate The object to validate.
   * @param {SC_Opts} [opts] The options object.
   * @return {SC_Validation} The theme validation info.
   */
  function validate_SC(obj_to_validate, opts) {
    const fallback_SC = opts?.fallback || default_SC
    if (!obj_to_validate) return { SC: fallback_SC, passed: false }

    /** @type {Storage_Config} */
    const valid_SC = {}
    let passed = true

    /** @type {Record<string, [string, boolean]>} */
    const validation_results = {}

    for (const [key, value_to_validate] of Object.entries(obj_to_validate)) {
      if (!(key in valid_values)) {
        validation_results[key] = [value_to_validate, false]
        passed = false
        continue
      }

      const typed_key = /** @type {keyof typeof config} */ (key)

      if (!valid_values[typed_key]?.has(value_to_validate)) {
        valid_SC[typed_key] = fallback_SC[typed_key]
        validation_results[typed_key] = [value_to_validate, false]
        passed = false
        continue
      }

      valid_SC[typed_key] = value_to_validate
      validation_results[typed_key] = [value_to_validate, true]
    }

    if (opts?.verbose) return { SC: valid_SC, passed, validation_results }
    return { SC: valid_SC, passed }
  }

  /**
   * Retrieves and validates the SC object from local storage.
   * @param {SC_Opts} [opts] - Optional settings for the SC retrieval.
   * @return {SC_Validation} - The SC validation info.
   */
  function get_SC(opts) {
    const storage_string = localStorage.getItem(config_SK)
    const parsed_obj = parse_JsonToObj(storage_string)
    const validation = validate_SC(parsed_obj, { fallback: opts?.fallback, verbose: opts?.verbose })
    return validation
  }

  /**
   * Stores/Updates the SC in the local storage after validating it.
   * @param {Storage_Config} SC_to_set - The SC to store.
   * @param {object} [opts] - Optional settings for the SC setting process.
   * @param {boolean} [opts.force] - Forces the SC to be stored even if it's the same as the current one.
   */
  function set_SC(SC_to_set, opts) {
    const { SC: current_SC, passed: is_current_SC_valid } = get_SC()
    const { SC: valid_SC_to_set, validation_results } = validate_SC(SC_to_set, { verbose: true })

    const tried_to_set_invalid_keys =
      validation_results &&
      Object.entries(validation_results)
        .filter(([key, [value, passed]]) => !passed)
        .map(([key, [value]]) => [key, value])

    if (tried_to_set_invalid_keys)
      warn('Func: set_SC - Tried to store invalid keys in storage config object.', Object.fromEntries(tried_to_set_invalid_keys))

    const new_SC = { ...current_SC }

    for (const key in valid_SC_to_set) {
      const typed_key = /** @type {keyof typeof valid_SC_to_set} */ (key)
      new_SC[typed_key] = valid_SC_to_set[typed_key]
    }

    const must_update = opts?.force || !is_current_SC_valid || (is_current_SC_valid && !isSameObj(new_SC, current_SC))

    if (!must_update) return

    localStorage.setItem(config_SK, JSON.stringify(new_SC))
    // TODO: trigger custom storage event
  }

  // #endregion

  // #region COLOR MODE (CM) ----------------------------------------------------------------

  /**
   * @typedef {{CM: string, passed: false, received: string, valid_values: string[]}|{CM: string, passed: true}} CM_Validation - The color mode validation info.
   * @typedef {{supported: true, CM: LIGHT | DARK} | {supported: false, CM: string}} CM_Pref - The user's preferred color mode.
   */

  /**
   * Retrieves the user's preferred color scheme (if supported) or a fallback one.
   * @returns {CM_Pref} The user's preferred color scheme
   */
  function get_CMPref() {
    const fallback_CM =
      (config.mode?.strategy === 'mono' && config.mode.key) ||
      ((config.mode?.strategy === 'custom' || (config.mode?.strategy === 'light_dark' && config.mode.enableSystem)) && config.mode.default) ||
      (config.mode?.strategy === 'light_dark' && config.mode.default) ||
      MODES.light

    if (!window.matchMedia || !window.matchMedia('(prefers-color-scheme)').matches) return { supported: false, CM: fallback_CM }

    const pref_CM = window.matchMedia('(prefers-color-scheme: dark)').matches ? MODES.dark : MODES.light
    return { supported: true, CM: pref_CM }
  }

  /**
   * Validates the provided CM
   * @param {string} CM - The color mode to validate.
   * @param {Object} [opts] - The options object.
   * @param {string} [opts.fallback] - The fallback color mode to use if the validation fails.
   * @returns {CM_Validation} - The color mode validation info.
   */
  function validate_CM(CM, opts) {
    const valid_CMs = valid_values['mode']

    if (!valid_CMs || !default_SC['mode']) {
      warn(`Func: validate_CM - Tried to validate a color mode but "mode" key is missing from the config object.`)
      return { CM: MODES.light, passed: false, received: CM, valid_values: [] }
    }

    const passed = valid_CMs.has(CM)

    if (!passed) {
      const fallback_CM =
        opts?.fallback ||
        (config.mode?.strategy === 'light_dark' && config.mode.enableSystem && default_SC['mode'] === config.mode.keys.system && !get_CMPref()
          ? config.mode.fallback
          : default_SC['mode'])
      return { CM: fallback_CM, passed: false, received: CM, valid_values: Array.from(valid_CMs) }
    }

    return { CM, passed: true }
  }

  /**
   * @param {string} CM
   */
  function resolve_CM(CM) {
    if (!config.mode) return warn('Func: resolve_CM - Trying to resolve color mode but "mode" key is missing from the config object.')
    if (config.mode.strategy !== 'light_dark' || !config.mode.enableSystem)
      return warn('Func: resolve_CM - Trying to resolve color mode but "system" but ')
  }
  // #endregion

  console.log(get_CMPref())
}
