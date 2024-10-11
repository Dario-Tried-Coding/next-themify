// @ts-check

/**
 *  @typedef {import('./types/script').Storage_Config} Storage_Config
 *  @typedef {import('./types/script').Config} Config
 */

/** @param {import('./types/script').Script_Params} params */
export function script(params) {
  const html = document.documentElement
  const { config_SK, config, constants } = params

  const { MODES, DEFAULT, STRATS } = constants

  // ---------------------------------------------------------------------
  // UTILS ---------------------------------------------------------------
  // ---------------------------------------------------------------------

  /**
   * Accede in modo sicuro a una proprietà annidata di un oggetto.
   *
   * @param {Record<string, any> | undefined} obj - L'oggetto da cui accedere alla proprietà.
   * @param {string} path - Il percorso della proprietà da accedere, formattato come stringa (es. "user.name").
   * @returns {*} - Il valore della proprietà se esiste, altrimenti `undefined`.
   */
  function safeGet(obj, path) {
    if (!obj || typeof obj !== 'object') {
      return undefined
    }

    const keys = path.split('.')

    let current = obj
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
      }
    }
    return current
  }

  /**
   * Parses a JSON string and returns the corresponding object if valid.
   *
   * @param {string | undefined | null} string - The JSON string to parse.
   * @returns {Record<string, any>|undefined} The parsed object if the input is a valid JSON object string, otherwise undefined.
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
   * @param {Object} obj1 - The first object to compare.
   * @param {Object} obj2 - The second object to compare.
   * @returns {boolean} `true` if the objects are the same, otherwise `false`.
   */
  function isSameObj(obj1, obj2) {
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false

    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length) return false

    for (const key of keys1) {
      // @ts-expect-error
      const val1 = obj1[key]
      // @ts-expect-error
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

  // ---------------------------------------------------------------------
  // STORAGE THEME -------------------------------------------------------
  // ---------------------------------------------------------------------

  /**
   * Retrieves the storage configuration from local storage, parses it, and validates it.
   *
   * @return {Record<string, any> | undefined} The theme validation info, including the parsed storage configuration and a boolean indicating if the validation was successful.
   */
  function get_SC() {
    const value = localStorage.getItem(config_SK)
    const parsed = parse_JsonToObj(value)
    return parsed
  }

  /**
   * @typedef {{config: Storage_Config, passed: boolean, validation_results?: Record<keyof Config, boolean>}} Theme_Validation The theme validation info.
   */

  /**
   * Safely parses and validates the received string, returning a valid StorageConfig (invalid keys are replaced with corresponding fallback/default theme's key) and a boolean indicating if the string validated successfully.
   * @param {Record<string, any> | undefined} obj The object to validate.
   * @param {Object} [opts] The options object.
   * @param {Storage_Config} [opts.fallback] The fallback value to use if the string is not valid. MUST BE VALID!!!
   * @param {boolean} [opts.verbose] Whether to log the validation result.
   * @return {Theme_Validation} The theme validation info.
   */
  function validate_SC(obj, opts) {
    const fallback_SC = opts?.fallback || default_SC
    if (!obj) return { config: fallback_SC, passed: false }

    /** @type {Theme_Validation['config']} */ // @ts-expect-error
    const valid_SC = {}
    let passed = true
    /** @type {NonNullable<Theme_Validation['validation_results']>} */ // @ts-expect-error
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
          config[key].keys.light || MODES.light,
          config[key].keys.dark || MODES.dark,
          config[key].keys.system || MODES.system,
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

    if (opts?.verbose) return { config: valid_SC, passed, validation_results }
    return { config: valid_SC, passed }
  }

  console.log(validate_SC(get_SC(), {verbose: true}))
}
