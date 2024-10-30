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

  function validate_config() {
    // MULTI & CUSTOM ------------------------------------------------------

    /** @type {import('./types/script').Validate_Multi_x_Custom_Strat} */
    function validate_multi_x_custom_strat(obj) {
      // Is "keys" provided?
      const is_keys_provided = obj.keys !== undefined
      if (!is_keys_provided) warn('Func: validate_multi_x_custom_strat - "keys" must be provided.', obj)

      // Is "keys" not empty?
      const is_empty = obj.keys.length === 0
      if (is_empty) warn('Func: validate_multi_x_custom_strat - "keys" cannot be empty.', obj)
      
      // Are all keys strings?
      const are_all_keys_strings = obj.keys.every((k) => typeof k === 'string')
      if (!are_all_keys_strings) warn('Func: validate_multi_x_custom_strat - "keys" must contain only strings.', obj.keys)

      // Is "default" provided?
      const is_default_provided = obj.default !== undefined
      if (!is_default_provided) warn('Func: validate_multi_x_custom_strat - "default" key must be provided.', obj)
      
      // Is "default" a string?
      const is_default_string = typeof obj.default === 'string'
      if (!is_default_string) warn('Func: validate_multi_x_custom_strat - "default" key must be a string.', obj)

      // Is "default" one of the provided keys?
      const is_valid = obj.keys.includes(obj.default)
      if (!is_valid) warn('Func: validate_multi_x_custom_strat - "default" key must be one of "keys".', obj)
    }

    // LIGHT_DARK ----------------------------------------------------------

    /** @type {import('./types/script').Validate_Light_Dark_Strat} */
    function validate_light_dark_mode(obj) {
      
      // KEYS -------------------------------------------------

      // Are all keys strings?
      const are_all_keys_strings = Object.keys(obj.keys).every((k) => typeof k === 'string')
      if (!are_all_keys_strings) warn('Func: validate_light_dark_mode - All keys must be strings.', obj.keys)

      const keys = Object.values(obj.keys).flat()
      const unique_keys = new Set(keys)

      // Are all different keys?
      const are_all_different = keys.length === unique_keys.size
      if (!are_all_different) warn('Func: validate_light_dark_mode - "light", "dark", "system" and "custom" keys must be different.', obj.keys)

      // Are "keys.light" and "keys.dark" keys provided?
      const is_light_dark_provided = obj.keys.light && obj.keys.dark
      if (!is_light_dark_provided) warn('Func: validate_light_dark_mode - "light" and "dark" keys must be provided.', obj.keys)

      // Is "keys.system" provided only if "enableSystem" is true?
      // @ts-expect-error - "keys.system" should'nt be provided if "enableSystem" is false
      const is_system_key_wrongly_provided = !obj.enableSystem && obj.keys.system
      if (is_system_key_wrongly_provided)
        warn('Func: validate_light_dark_mode - "keys.system" should not be provided if "enableSystem" is false.', obj)

      // Is "keys.custom" key not empty?
      const is_one_custom_provided = obj.keys.custom && obj.keys.custom.length > 0
      if (!is_one_custom_provided) warn('Func: validate_light_dark_mode - "custom" key must contain at least one mode.', obj.keys)

      // ENABLE SYSTEM -------------------------------------------------

      // Is "enableSystem" provided?
      const is_enable_system_provided = obj.enableSystem !== undefined
      if (!is_enable_system_provided) warn('Func: validate_light_dark_mode - "enableSystem" key must be provided.', obj)

      // Is "enableSystem" a boolean?
      const is_enable_system_boolean = typeof obj.enableSystem === 'boolean'
      if (!is_enable_system_boolean) warn('Func: validate_light_dark_mode - "enableSystem" key must be a boolean.', obj)

      // DEFAULT -------------------------------------------------------

      // Is "default" key provided?
      const is_default_provided = obj.default !== undefined
      if (!is_default_provided) warn('Func: validate_light_dark_mode - "default" key must be provided.', obj)

      // Is "default" key a string?
      const is_default_string = typeof obj.default === 'string'
      if (!is_default_string) warn('Func: validate_light_dark_mode - "default" key must be a string.', obj)

      // Is "default" key one of the provided values?
      const is_valid_default = unique_keys.has(obj.default)
      if (!is_valid_default)
        warn('Func: validate_light_dark_mode - "default" key must be one of the provided values in "keys".', { default: obj.default, keys: obj.keys })

      // FALLBACK -------------------------------------------------------

      // Is "fallback" key provided only if "enableSystem" is true?
      // @ts-expect-error - "fallback" should'nt be provided if "enableSystem" is false
      const is_fallback_wrongly_provided = !obj.enableSystem && obj.fallback
      if (is_fallback_wrongly_provided) warn('Func: validate_light_dark_mode - "fallback" key should not be provided if "enableSystem" is false.', obj)

      // Is "fallback" key a string (if provided)?
      const is_fallback_string = !obj.enableSystem || (obj.enableSystem && typeof obj.fallback === 'string')
      if (!is_fallback_string) warn('Func: validate_light_dark_mode - "fallback" key must be a string.', obj)

      // Is "fallback" key one of the provided values (except "system" key)?
      const non_system_keys = Array.from(unique_keys).filter((k) => (obj.enableSystem ? k !== obj.keys.system : true)) // Every key except "system" (if enabled)
      const is_invalid_fallback = obj.enableSystem && !non_system_keys.includes(obj.fallback) // Invalid if "fallback" key is not one of the provided values (excluding "system" key)
      if (is_invalid_fallback)
        warn('Func: validate_light_dark_mode - "fallback" key must be one of the provided values in "keys" (but not "keys.system").', {
          fallback: obj.fallback,
          keys: obj.keys,
        })
    }

    // ---------------------------------------------------------------------

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
