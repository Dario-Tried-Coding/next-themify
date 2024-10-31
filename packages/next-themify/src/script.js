// @ts-check

/**
 * @typedef {import('./types/index').Prop} Prop
 * @typedef {import('./types/script').Storage_Config} Storage_Config
 * @typedef {import('./types/script').SC_Validation<false>} SC_Validation_Dry
 * @typedef {import('./types/script').SC_Validation<true>} SC_Validation_Verbose
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
   * @param {Record<string, any> | undefined | null} obj1 - The first object to compare.
   * @param {Record<string, any> | undefined | null} obj2 - The second object to compare.
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

  function construct_available_values() {
    /** @type {import('./types/script').Available_Values} */
    const available_values = {}

    for (const [key, strat_obj] of Object.entries(config)) {
      const typed_key = /** @type {Prop} */ (key)

      if (strat_obj.strategy === 'mono') available_values[typed_key] = new Set([strat_obj.key])
      else if (strat_obj.strategy === 'light_dark') available_values[typed_key] = new Set(Object.values(strat_obj.keys).flat())
      else available_values[typed_key] = new Set(strat_obj.keys)
    }

    return available_values
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

  /** All the available values of ONLY the props that Next-Themify must handle (based on config obj). */
  const available_values = construct_available_values()
  /** Default values of ONLY the props that Next-Themify must handle (based on config obj). */
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
      if (is_fallback_wrongly_provided)
        warn('Func: validate_light_dark_mode - "fallback" key should not be provided if "enableSystem" is false.', obj)

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

  // #region STORAGE CONFIG (SC) -----------------------------------------------------------------------------------------

  /**
   * It returns a Storage Config (SC) object with ONLY the props that Next-Themify must handle (based on the config obj).
   *
   * Each prop will either contain:
   * - The value from the stringified obj to validate (if provided and valid)
   * - The provided fallback value (if provided and valid)
   * - The default value from the config obj
   *
   * It won't execute if the provided string is not a valid obj. In this case it will return the fallback values (provided or default).
   *
   * If the string obj is missing some of the props that Next-Themify must handle, they will be added to the SC object with the fallback value (provided or default).
   *
   * @type {import('./types/script').Validate_SC}
   */
  function validate_SC(unsafe_string, opts) {
    const obj = parse_JsonToObj(unsafe_string) // Parse the string to an object (if proper stringified obj)

    /**
     * The fallback value for ONLY the props that Next-Themify must handle.
     *
     * It will either be:
     * - The default value from the config obj
     * - The provided fallback value (if provided and valid)
     */
    const fallback_SC = default_SC // Initially take as fallback the default values from the config obj

    // If opts.fallback_SC is provided, for each prop that Next-Themify must handle use instead the provided fallback value (if provided and valid)
    if (opts?.fallback_SC) {
      for (const key in fallback_SC) {
        const typed_key = /** @type {Prop} */ (key)
        const override_fallback = opts.fallback_SC[typed_key]
        const is_valid_fallback = override_fallback && available_values[typed_key]?.has(override_fallback)
        if (is_valid_fallback) fallback_SC[typed_key] = override_fallback
      }
    }

    if (!obj) {
      /** @type {SC_Validation_Verbose} */
      const verbose_imp_validation = { SC: fallback_SC, passed: false, executed: false, received: unsafe_string }
      /** @type {SC_Validation_Dry} */
      const dry_imp_validation = { SC: fallback_SC, passed: false }

      // @ts-expect-error - If opts.verbose is true, validation info must be included
      return opts?.verbose ? verbose_imp_validation : dry_imp_validation
    }

    /**
     * The valid value to return for ONLY the props that Next-Themify must handle.
     *
     * - The value from the obj to validate (if provided and valid)
     * - The fallback one (either the provided or the default one from the config obj)
     */
    const valid_SC = /** @type {Storage_Config} */ ({})
    const results = /** @type {import('./types/script').SC_Validation_Executed['results']} */ ({})
    let passed = true

    // Cycle through each prop in the obj to validate.
    // Valid prop: one of the props that Next-Themify must handle.
    //
    // If not valid prop, it will be ignored.
    // If valid prop and valid value, it will be part of the Storage Config obj.
    // If valid prop end invalid value, the fallback value will be used instead.

    for (const [key, value_to_validate] of Object.entries(obj)) {
      if (!(key in available_values)) {
        results[key] = [value_to_validate, false]
        passed = false
        continue
      }

      const typed_key = /** @type {Prop} */ (key)

      const is_valid_value = value_to_validate && available_values[typed_key]?.has(value_to_validate)

      if (is_valid_value) {
        valid_SC[typed_key] = value_to_validate
        results[typed_key] = [value_to_validate, true]
        continue
      }

      valid_SC[typed_key] = fallback_SC[typed_key]
      results[typed_key] = [value_to_validate, false]
      passed = false
    }

    // If some props are missing, add them to the Storage Config obj with the fallback value.
    for (const key in fallback_SC) {
      const typed_key = /** @type {Prop} */ (key)

      if (key in valid_SC) continue
      valid_SC[typed_key] = fallback_SC[typed_key]
    }

    /** @type {SC_Validation_Verbose} */
    const verbose_SC_validation = { SC: valid_SC, passed, executed: true, results, parsed: obj }
    /** @type {SC_Validation_Dry} */
    const dry_SC_validation = { SC: valid_SC, passed }

    //@ts-expect-error - If opts.verbose is true, validation info must be included
    return opts?.verbose ? verbose_SC_validation : dry_SC_validation
  }

  /**
   * It retrieves and validates the SC object from the local storage.
   *
   * If no SC or invalid, it will return the fallback values (provided or default).
   *
   * @type {import('./types/script').Get_SC}
   */
  function get_SC(opts) {
    const storage_string = localStorage.getItem(config_SK) // Retrieve WHATEVER is stored in the device local storage (if present)
    const validation = validate_SC(storage_string, opts) // Validate the object (if proper obj) o give back fallback values (provided or default)
    return validation
  }

  /**
   * It sets/updates the SC with the provided new values (if ALL the provided obj is valid).
   * 
   * If both the new and old SCs are valid, it will execute only if needed (if the two are different).
   * 
   * @type {import('./types/script').Set_SC}
   */
  function set_SC(SC, opts) {
    const current_SC_validation = get_SC({ verbose: true })
    const SC_validation = validate_SC(JSON.stringify(SC), { verbose: true })

    // It will always execute since we're passing a stringified obj
    // If the provided SC holds invalid keys/values, throw a warning and do not update the SC object.
    if (!SC_validation.passed && SC_validation.executed) {
      warn('Func: set_SC - Tried to store invalid keys in storage config object.', SC_validation.results)

      /** @type {import('./types/script').Verbose_Set_SC} */
      const verbose_info = {
        updated: false,
        is_valid: false,
        received: SC,
        available_values,
        was_valid: current_SC_validation.passed,
        ...(!current_SC_validation.executed || !isSameObj(SC, current_SC_validation.parsed)
          ? { are_same: false, old: current_SC_validation.executed ? current_SC_validation.parsed : current_SC_validation.received }
          : { are_same: true }),
      }

      // @ts-expect-error - If opts.verbose is false there's no need to return anything
      return opts?.verbose ? verbose_info : undefined
    }

    const new_SC = { ...current_SC_validation.SC } // ONLY the props that Next-Themify must handle. Either the current or default values

    // Give new_SC the new values to set (only the required props)
    for (const key in SC_validation.SC) {
      const typed_key = /** @type {keyof typeof SC_validation['SC']} */ (key)
      new_SC[typed_key] = SC_validation.SC[typed_key]
    }

    const must_update = opts?.force || !current_SC_validation.passed || (current_SC_validation.passed && !isSameObj(current_SC_validation.SC, new_SC))

    /** @type {import('./types/script').Verbose_Set_SC} */
    const verbose_info = {
      updated: must_update,
      is_valid: true,
      received: SC,
      was_valid: current_SC_validation.passed,
      ...(isSameObj(current_SC_validation.executed ? current_SC_validation.parsed : undefined, SC)
        ? { are_same: true }
        : { are_same: false, old: current_SC_validation.executed ? current_SC_validation.parsed : current_SC_validation.received }),
    }
    
    // @ts-expect-error - If opts.verbose is false there's no need to return anything
    if (!must_update) return opts?.verbose ? verbose_info : undefined
    
    localStorage.setItem(config_SK, JSON.stringify(new_SC))
    
    // @ts-expect-error - If opts.verbose is false there's no need to return anything
    return opts?.verbose ? verbose_info : undefined
  }

  // #endregion
}
