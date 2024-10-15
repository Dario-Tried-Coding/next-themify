// @ts-check

/**
 *  @typedef {import('./types/script').Storage_Config} Storage_Config
 *  @typedef {import('./types/script').Config} Config
 */

/** @param {import('./types/script').Script_Params} params */
export function script(params) {
  const html = document.documentElement
  const { config_SK, config, constants } = params

  const { STRATS } = constants

  // ---------------------------------------------------------------------
  // UTILS ---------------------------------------------------------------
  // ---------------------------------------------------------------------

  /**
   * @typedef {Record<string, any>} Generic_Obj - A generic object
   */

  /**
   * Parses a JSON string and returns the corresponding object if valid.
   *
   * @param {string | undefined | null} string - The JSON string to parse.
   * @returns {Generic_Obj | undefined} The parsed object if the input is a valid JSON object string, otherwise undefined.
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
   *
   * @param {Generic_Obj} obj1 - The first object to compare.
   * @param {Generic_Obj} obj2 - The second object to compare.
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

  // ---------------------------------------------------------------------
  // CONFIG --------------------------------------------------------------
  // ---------------------------------------------------------------------

  function construct_DefaultST() {
    /** @type {Storage_Config} */ // @ts-ignore
    const default_ST = {}

    for (const [key, value] of Object.entries(config)) {
      if (value.strategy === STRATS.mono) Object.assign(default_ST, { [key]: value.key })
      else Object.assign(default_ST, { [key]: value.default })
    }

    return default_ST
  }
  const default_SC = construct_DefaultST()

  function construct_Valid_Values() {
    /** @type {Record<string, string[]>} */ // @ts-ignore
    const valid_values = {}

    for (const [key, value] of Object.entries(config)) {
      if (value.strategy === STRATS.mono) valid_values[key] = [value.key]
      else if (value.strategy === STRATS.multi.light_dark)
        valid_values[key] = [
          value.keys.light,
          value.keys.dark,
          ...(value.enableSystem && value.keys.system ? [value.keys.system] : []),
          ...(value.keys.custom || []),
        ]
      else valid_values[key] = value.keys
    }

    return valid_values
  }
  const valid_values = construct_Valid_Values()

  const supports_CMPref = window.matchMedia && window.matchMedia('(prefers-color-scheme)').matches

  // ---------------------------------------------------------------------
  // STORAGE THEME -------------------------------------------------------
  // ---------------------------------------------------------------------

  /**
   * @typedef {{fallback?: Storage_Config, verbose?: boolean}} SC_Opts The options object for the storage config functions.
   * @typedef {{SC: Storage_Config, passed: boolean, validation_results?: Record<keyof Config, boolean>}} SC_Validation The theme validation info.
   */

  /**
   * Retrieves the storage configuration from local storage and parses it if valid object.
   * @param {SC_Opts} [opts] The options object.
   * @return {SC_Validation} The parsed object if the stored value is a valid JSON object string, otherwise undefined.
   */
  function get_SC(opts) {
    const value = localStorage.getItem(config_SK)
    const parsed = parse_JsonToObj(value)
    const validation = validate_SC(parsed, { fallback: opts?.fallback, verbose: opts?.verbose })
    return validation
  }

  /**
   * Safely parses and validates the received string, returning a valid StorageConfig (invalid keys are replaced with corresponding fallback/default theme's key) and a boolean indicating if the string validated successfully.
   * @param {Generic_Obj | undefined} obj The object to validate.
   * @param {SC_Opts} [opts] The options object.
   * @return {SC_Validation} The theme validation info.
   */
  function validate_SC(obj, opts) {
    const fallback_SC = opts?.fallback || default_SC
    if (!obj) return { SC: fallback_SC, passed: false }

    /** @type {SC_Validation['SC']} */
    const valid_SC = {}
    let passed = true
    /** @type {NonNullable<SC_Validation['validation_results']>} */ // @ts-expect-error
    const validation_results = {}

    for (const config_key in config) {
      const value_to_validate = obj[config_key]

      /** @type {string[]} */
      let valid_values = []
      /** @type {keyof Config} */ // @ts-ignore
      const key = config_key
      if (!config[key]) continue

      if (config[key].strategy === 'mono') valid_values = [config[key].key]
      else if (config[key].strategy === 'light_dark') {
        valid_values = [
          config[key].keys.light,
          config[key].keys.dark,
          ...(config[key].enableSystem && config[key].keys.system ? config[key].keys.system : []),
          ...(config[key].keys.custom ? config[key].keys.custom : []),
        ]
      } else valid_values = config[key].keys

      if (!valid_values.includes(value_to_validate)) {
        Object.assign(valid_SC, { [key]: fallback_SC[key] })
        Object.assign(validation_results, { [key]: false })
        passed = false
      } else {
        Object.assign(valid_SC, { [key]: value_to_validate })
        Object.assign(validation_results, { [key]: true })
      }
    }

    if (opts?.verbose) return { SC: valid_SC, passed, validation_results }
    return { SC: valid_SC, passed }
  }

  /**
   * @param {Storage_Config} obj
   * @param {object} [opts]
   * @param {boolean} [opts.force]
   */
  function set_SC(obj, opts) {
    const { SC: current_SC, passed } = get_SC()

    const new_SC = { ...current_SC }

    // @ts-expect-error
    for (const key in obj) new_SC[key] = obj[key]

    const must_force = opts?.force
    const must_update = must_force || !passed || (passed && !isSameObj(new_SC, current_SC))

    if (!must_update) return

    localStorage.setItem(config_SK, JSON.stringify(new_SC))
    // TODO: trigger custom storage event
  }

  // ---------------------------------------------------------------------
  // COLOR MODE ----------------------------------------------------------
  // ---------------------------------------------------------------------

  /**
   * @typedef {{CM: string, resolved: boolean}} Revolve_CM_Result - The resolved color mode info.
   * @typedef {{CM: string, passed: false, from: string}|{CM: string, passed: true}} CM_Validation - The color mode validation info.
   */

  /**
   * Indicates if the browser supports ColorMode preference.
   * @returns {undefined | 'light' | 'dark'} Either true if it's supported, or false otherwise.
   */
  function get_CMPref() {
    if (!window.matchMedia || !window.matchMedia('(prefers-color-scheme)').matches) return undefined
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  /**
   * Resolves the color mode based on the provided color mode and system support&preferences.
   * @param {string} CM - The color mode to resolve if necessary.
   * @returns {Revolve_CM_Result | void} - The resolved color mode info.
   */
  function resolve_CM(CM) {
    if (!config.mode) return console.error('[Next-Themify] Func: resolve_CM - Trying to resolve color mode but color mode is not enabled.')

    const CM_validation = validate_CM(CM)

    const is_valid = CM_validation && CM_validation.passed
    if (!is_valid) return console.error('[Next-Themify] Func: resolve_CM - Trying to resolve color mode but the provided color mode is not valid. Provided color mode: ', CM)

    if (config.mode.strategy === 'light_dark' && config.mode.enableSystem && CM === config.mode.keys.system) {
      const CM_pref = get_CMPref()
      if (!CM_pref) return { CM: config.mode.fallback, resolved: true }
      return { CM: CM_pref === 'dark' ? config.mode.keys.dark : config.mode.keys.light, resolved: true }
    }

    return { CM, resolved: false }
  }

  /**
   * Validates the provided color mode (CM) against the configured valid values.
   *
   * @param {string} CM - The color mode to validate.
   * @param {Object} [opts] - The options object.
   * @param {string} [opts.fallback] - The fallback color mode to use if the validation fails.
   * @returns {CM_Validation | void} The color mode validation info.
   */
  function validate_CM(CM, opts) {
    if (!config.mode || !valid_values['mode']) return console.error('[Next-Themify] Func: validate_CM - Trying to validate color mode but color mode is not enabled.')

    const is_valid = valid_values['mode'].includes(CM)

    if (!is_valid) {
      let fallback_CM = opts?.fallback || (config.mode.strategy === 'mono' ? config.mode.key : config.mode.default)

      return { CM: fallback_CM, passed: false, from: CM }
    }

    return { CM, passed: true }
  }

  console.log(validate_CM('system'))
}
