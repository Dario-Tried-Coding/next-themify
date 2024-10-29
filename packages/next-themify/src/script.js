// @ts-check

/**
  * @typedef {import('./types/index').Prop} Prop
  * @typedef {import('./types/script').Storage_Config} Storage_Config
 */

/** @param {import('./types/script').Script_Params} params */
export function script(params) {
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

  const html = document.documentElement

  const {
    config_SK,
    config,
    constants: { STRATS, MODES },
  } = params

  // #region UTILS ------------------------------------------------------------------------------------------------------

  /** @type {import('./types/script').Warn} */
  function warn(msg, ...args) {
    console.warn(`[next-themify] ${msg}`, ...args)
    init_library = false
  }

  function construct_valid_values() {
    /** @type {import('./types/script').Valid_Values} */
    const valid_values = {}

    for (const [key, strat_obj] of Object.entries(config)) {
      const typed_key = /** @type {Prop} */ (key)

      if (strat_obj.strategy === 'mono') valid_values[typed_key] = new Set([strat_obj.key])
      else if (strat_obj.strategy === 'light_dark') valid_values[typed_key] = new Set(Object.values(strat_obj.keys).flat())
      else valid_values[typed_key] = new Set(strat_obj.keys)
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

  /** Available values of ONLY the props provided in the config obj */
  const valid_values = construct_valid_values()
  /** Default values of ONLY the props provided in the config obj */
  const default_SC = construct_default_SC()

  // #region CONFIG VALIDATION ------------------------------------------------------------------------------------------

  /** @type {import('./types/script').Validate_Multi_x_Custom_Strat} */
  function validate_multi_x_custom_strat(obj) {
    const is_empty = obj.keys.length === 0
    if (is_empty) warn('Func: validate_multi_x_custom_strat - "keys" cannot be empty.', obj)

    const is_valid = obj.keys.includes(obj.default)
    if (!is_valid) warn('Func: validate_multi_x_custom_strat - "default" key must be one of "keys".', obj)
  }

  /** @type {import('./types/script').Validate_Light_Dark_Strat} */
  function validate_light_dark_mode(obj) {
    const keys = Object.values(obj.keys).flat()

    // Are all different?
    const unique_keys = new Set(keys)
    const are_all_different = keys.length === unique_keys.size
    if (!are_all_different) warn('Func: validate_light_dark_mode - "light", "dark", "system" and "custom" keys must be different.', obj.keys)

    // Is "default" key valid?
    const is_valid_default = unique_keys.has(obj.default)
    if (!is_valid_default)
      warn('Func: validate_light_dark_mode - "default" key must be one of the provided values in "keys".', { default: obj.default, keys: obj.keys })

    // Is "fallback" key valid?
    const is_valid_fallback =
      !obj.enableSystem ||
      (obj.enableSystem &&
        Array.from(unique_keys)
          .filter((k) => k !== obj.keys.system)
          .includes(obj.fallback))
    if (!is_valid_fallback)
      warn('Func: validate_light_dark_mode - "fallback" key must be one of the provided values in "keys" ("system" excluded).', {
        fallback: obj.fallback,
        keys: obj.keys,
      })
    
    // Is at least one "custom" mode provided?
    const is_one_custom_provided = obj.keys.custom && obj.keys.custom.length > 0
    if (!is_one_custom_provided) warn('Func: validate_light_dark_mode - "custom" key must contain at least one mode.', obj.keys)
  }

  function validate_config() {
    for (const strat_obj of Object.values(config)) {
      if (strat_obj.strategy === STRATS.mono) continue
      else if (strat_obj.strategy === STRATS.custom || strat_obj.strategy === STRATS.multi) validate_multi_x_custom_strat(strat_obj)
      else if (strat_obj.strategy === STRATS.light_dark) validate_light_dark_mode(strat_obj)
    }
  }

  // #endregion

  let init_library = true
  validate_config()
}
