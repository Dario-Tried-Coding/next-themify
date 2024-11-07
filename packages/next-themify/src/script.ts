import { Custom_Strat, Light_Dark_Strat, Mono_Strat, Multi_Strat, Prop } from './types/index'
import { Available_Values, SC_Opts, SC_Validation, Script_Params, Set_SC_Info, Storage_Config } from './types/script'

export function script(params: Script_Params) {
  const html = document.documentElement

  const {
    config_SK,
    mode_SK,
    config,
    constants: { STRATS, MODES },
  } = params

  let init_library = true
  validate_config()

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
    const default_values: Storage_Config = {}

    for (const [key, value] of Object.entries(config)) {
      const typed_key = key as keyof typeof default_values

      if (value.strategy === STRATS.mono) default_values[typed_key] = value.key
      else default_values[typed_key] = value.default
    }

    return default_values
  }

  // #endregion

  // #region CONFIG VALIDATION ------------------------------------------------------------------------------------------

  function validate_config() {
    const validate_mono_strat = (obj: Mono_Strat<string>) => {
      // Is "key" provided?
      const is_key_provided = obj.key !== undefined
      if (!is_key_provided) warn('Func: validate_mono_strat - "key" must be provided.', obj)

      // Is "key" a string?
      const is_key_string = typeof obj.key === 'string'
      if (!is_key_string) warn('Func: validate_mono_strat - "key" must be a string.', obj)
    }

    const validate_multi_strat = (obj: Multi_Strat<string[]>) => {
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

    const validate_custom_strat = (obj: Custom_Strat<string[]>) => {
      // Is "keys" provided?
      const is_keys_provided = obj.keys !== undefined
      if (!is_keys_provided) warn('Func: validate_multi_x_custom_strat - "keys" must be provided.', obj)

      // Is "keys" not empty?
      const is_empty = obj.keys.length === 0
      if (is_empty) warn('Func: validate_multi_x_custom_strat - "keys" cannot be empty.', obj)

      // Are all keys strings?
      const are_all_keys_strings = obj.keys.every((k) => typeof k.key === 'string')
      if (!are_all_keys_strings) warn('Func: validate_multi_x_custom_strat - "keys" must contain only strings.', obj.keys)

      // Is "default" provided?
      const is_default_provided = obj.default !== undefined
      if (!is_default_provided) warn('Func: validate_multi_x_custom_strat - "default" key must be provided.', obj)

      // Is "default" a string?
      const is_default_string = typeof obj.default === 'string'
      if (!is_default_string) warn('Func: validate_multi_x_custom_strat - "default" key must be a string.', obj)

      // Is "default" one of the provided keys?
      const is_valid = obj.keys.map((k) => k.key).includes(obj.default)
      if (!is_valid) warn('Func: validate_custom_strat - "default" key must be one of "keys".', obj)
    }

    const validate_light_dark_mode = (obj: Light_Dark_Strat<{ light: string; dark: string; system: string; custom: string[] }>) => {
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
      if (strat_obj.strategy === STRATS.mono) validate_mono_strat(strat_obj)
      else if (strat_obj.strategy === STRATS.multi) validate_multi_strat(strat_obj)
      else if (strat_obj.strategy === STRATS.custom) validate_custom_strat(strat_obj)
      else if (strat_obj.strategy === STRATS.light_dark) validate_light_dark_mode(strat_obj)
    }
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
  function validate_SC<V extends boolean>(unsafe_string: string | undefined | null, opts: SC_Opts<V>): SC_Validation<V> {
    const obj = parse_JsonToObj(unsafe_string) // Parse the string to an object (if proper stringified obj)

    const fallback_SC = default_values // Fallback values: default values (based on config obj)

    // If opts.fallback_SC is provided -> override each prop that Next-Themify must handle with the provided fallback value (if provided and valid)
    if (opts?.fallback_SC) {
      for (const key of props_to_handle) {
        const override_fallback = opts.fallback_SC[key]
        const is_valid_fallback = override_fallback && available_values[key]?.has(override_fallback)
        if (is_valid_fallback) fallback_SC[key] = override_fallback
      }
    }

    if (!obj) {
      const dry: SC_Validation<false> = { SC: fallback_SC, valid: false, results: {} }
      const verbose: SC_Validation<true> = { ...dry, performed_on: { string: unsafe_string, obj } }

      // @ts-expect-error - If opts.verbose is true, validation info must be included
      return opts?.verbose ? verbose : dry
    }

    const valid_SC_to_return: Storage_Config = {} // stringified values (if provided and valid) -> fallback values: provided (if provided and valid) or default (based on config obj)
    const results: SC_Validation<true>['results'] = {}

    let valid = true

    for (const [prop, value_to_validate] of Object.entries(obj)) {
      // If prop not one of props_to_handle -> record value's validity and skip to the next prop
      if (!props_to_handle.includes(prop as Prop)) {
        results[prop] = [value_to_validate, false]
        valid = false
        continue
      }

      // If prop is one of props_to_handle...
      const prop_to_handle = prop as Prop
      const is_valid_value = available_values[prop_to_handle]?.has(value_to_validate)

      // If valid -> add to return obj, record value's validity and skip to the next prop
      if (is_valid_value) {
        valid_SC_to_return[prop_to_handle] = value_to_validate
        results[prop_to_handle] = [value_to_validate, true]
        continue
      }

      // If not valid -> add fallback value to return obj, record value's validity and skip to the next prop
      valid_SC_to_return[prop_to_handle] = fallback_SC[prop_to_handle]
      results[prop_to_handle] = [value_to_validate, false]
      valid = false
    }

    // If missing props -> use fallback values (provided or default)
    for (const prop of props_to_handle) {
      if (prop in valid_SC_to_return) continue
      valid_SC_to_return[prop] = fallback_SC[prop]
    }

    const dry: SC_Validation<false> = { SC: valid_SC_to_return, valid, results }
    const verbose: SC_Validation<true> = { ...dry, performed_on: { string: unsafe_string, obj } }

    //@ts-expect-error - If opts.verbose is true, validation info must be included
    return opts?.verbose ? verbose : dry
  }

  /**
   * It retrieves and validates the SC object from the local storage.
   * - If no/invalid/incomplete SC -> fallback values (provided or default)
   */
  function get_SC<V extends boolean>(opts: SC_Opts<V>): SC_Validation<V> {
    const storage_string = localStorage.getItem(config_SK) // Retrieve WHATEVER is stored in the device local storage (if present)
    const validation = validate_SC(storage_string, opts) // Validate whatever is retrieved from the local storage
    return validation
  }

  /**
   * It sets/updates the SC with the provided new values.
   * - If valid both new & old -> execute only if needed (if the two are different)
   */
  function set_SC<V extends boolean>(SC: Storage_Config, opts: { force?: boolean, verbose?: V }):Set_SC_Info<V> {
    const retrieved_SC = get_SC({ verbose: opts.verbose })
    const provided_SC = validate_SC(JSON.stringify(SC), { verbose: opts.verbose })

    const SC_to_set = { ...retrieved_SC.SC } // ONLY props_to_handle -> either retrieved or default values

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
   *
   * - It executes only if "mode" prop is enabled in the config obj.
   * - If not valid, it will return the "fallback" value (if provided and valid) or the "default" value.
   *
   * @type {import('./types/script').Validate_CM}
   */
  function validate_CM(CM, opts) {
    // If "mode" is not enabled in the config obj, throw a warning and return "undefined"
    if (!config.mode || !available_values.mode || !default_values.mode) {
      warn('Func: validate_CM - trying to validate color mode but "mode" prop is missing from the config object.', config)

      /** @type {Verbose_CM_Validation} */
      const verbose = { passed: false, CM: undefined, received: CM, available_values: [] }
      /** @type {Dry_CM_Validation} */
      const dry = { passed: false, CM: undefined }

      // @ts-expect-error - If opts.verbose is true, validation info must be included
      return opts?.verbose ? verbose : dry
    }

    // exclude "keys.system" if "opts.resolve" is true
    const available_modes = opts?.resolve
      ? new Set(
          [...available_values.mode].filter(
            (m) => m !== (config.mode?.strategy === 'light_dark' && config.mode.enableSystem && config.mode.keys.system)
          )
        )
      : available_values.mode

    // If "fallback" is provided, check if it's a valid value
    const is_fallback_valid = typeof opts?.fallback_CM === 'string' && available_modes.has(opts.fallback_CM)
    if (!is_fallback_valid)
      warn('Func: validate_CM - the provided "fallback" value is not valid... using "default" value as "fallback"', {
        provided: opts?.fallback_CM,
        available_values: available_values.mode,
        default: default_values.mode,
      })

    const fallback_CM = is_fallback_valid ? opts.fallback_CM : default_values.mode

    // If no CM is provided, return the fallback (provided or default) value
    if (!CM) {
      /** @type {Verbose_CM_Validation} */
      const verbose = { passed: false, CM: fallback_CM, received: CM, available_values: Array.from(available_values.mode) }
      /** @type {Dry_CM_Validation} */
      const dry = { passed: false, CM: fallback_CM }

      // @ts-expect-error - If opts.verbose is true, validation info must be included
      return opts?.verbose ? verbose : dry
    }

    const passed = available_values.mode.has(CM)

    if (!passed) {
      /** @type {Verbose_CM_Validation} */
      const verbose = { passed: false, CM: fallback_CM, received: CM, available_values: Array.from(available_values.mode) }
      /** @type {Dry_CM_Validation} */
      const dry = { passed: false, CM: fallback_CM }

      // @ts-expect-error - If opts.verbose is true, validation info must be included
      return opts?.verbose ? verbose : dry
    }

    /** @type {Verbose_CM_Validation} */
    const verbose = { passed: true, CM, available_values: Array.from(available_values.mode) }
    /** @type {Dry_CM_Validation} */
    const dry = { passed: true, CM }

    // @ts-expect-error - If opts.verbose is true, validation info must be included
    return opts?.verbose ? verbose : dry
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

  // #region STORAGE MODE (SM) -----------------------------------------------------------------------------------------

  /**
   * It retrieves and validates the current SM from the local storage.
   *
   * - If no SM (or invalid): it returns the fallback value (if provided and valid) or the default value.
   * @type {import('./types/script').Get_SM} */
  function get_SM(opts) {
    const string = localStorage.getItem(mode_SK)
    const validation = validate_CM(string, opts)
    return validation
  }

  // #endregion

  // #region COLOR SCHEME (SC) -----------------------------------------------------------------------------------------

  /** @type {import('./types/script').Get_CSPref} */
  function get_CSPref() {
    if (!window.matchMedia || !window.matchMedia('(prefers-color-scheme)').matches) return undefined
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? MODES.dark : MODES.light
  }

  // #endregion

  console.log('hi from script')
}
