// #region CONFIG VALIDATION ------------------------------------------------------------------------------------------

// function validate_config() {
//   const validate_mono_strat = (obj: Mono_Strat<string>) => {
//     // Is "key" provided?
//     const is_key_provided = obj.key !== undefined
//     if (!is_key_provided) warn('Func: validate_mono_strat - "key" must be provided.', obj)

//     // Is "key" a string?
//     const is_key_string = typeof obj.key === 'string'
//     if (!is_key_string) warn('Func: validate_mono_strat - "key" must be a string.', obj)
//   }

//   const validate_multi_strat = (obj: Multi_Strat<string[]>) => {
//     // Is "keys" provided?
//     const is_keys_provided = obj.keys !== undefined
//     if (!is_keys_provided) warn('Func: validate_multi_x_custom_strat - "keys" must be provided.', obj)

//     // Is "keys" not empty?
//     const is_empty = obj.keys.length === 0
//     if (is_empty) warn('Func: validate_multi_x_custom_strat - "keys" cannot be empty.', obj)

//     // Are all keys strings?
//     const are_all_keys_strings = obj.keys.every((k) => typeof k === 'string')
//     if (!are_all_keys_strings) warn('Func: validate_multi_x_custom_strat - "keys" must contain only strings.', obj.keys)

//     // Is "default" provided?
//     const is_default_provided = obj.default !== undefined
//     if (!is_default_provided) warn('Func: validate_multi_x_custom_strat - "default" key must be provided.', obj)

//     // Is "default" a string?
//     const is_default_string = typeof obj.default === 'string'
//     if (!is_default_string) warn('Func: validate_multi_x_custom_strat - "default" key must be a string.', obj)

//     // Is "default" one of the provided keys?
//     const is_valid = obj.keys.includes(obj.default)
//     if (!is_valid) warn('Func: validate_multi_x_custom_strat - "default" key must be one of "keys".', obj)
//   }

//   const validate_custom_strat = (obj: Custom_Strat<string[]>) => {
//     // Is "keys" provided?
//     const is_keys_provided = obj.keys !== undefined
//     if (!is_keys_provided) warn('Func: validate_multi_x_custom_strat - "keys" must be provided.', obj)

//     // Is "keys" not empty?
//     const is_empty = obj.keys.length === 0
//     if (is_empty) warn('Func: validate_multi_x_custom_strat - "keys" cannot be empty.', obj)

//     // Are all keys strings?
//     const are_all_keys_strings = obj.keys.every((k) => typeof k.key === 'string')
//     if (!are_all_keys_strings) warn('Func: validate_multi_x_custom_strat - "keys" must contain only strings.', obj.keys)

//     // Is "default" provided?
//     const is_default_provided = obj.default !== undefined
//     if (!is_default_provided) warn('Func: validate_multi_x_custom_strat - "default" key must be provided.', obj)

//     // Is "default" a string?
//     const is_default_string = typeof obj.default === 'string'
//     if (!is_default_string) warn('Func: validate_multi_x_custom_strat - "default" key must be a string.', obj)

//     // Is "default" one of the provided keys?
//     const is_valid = obj.keys.map((k) => k.key).includes(obj.default)
//     if (!is_valid) warn('Func: validate_custom_strat - "default" key must be one of "keys".', obj)
//   }

//   const validate_light_dark_mode = (obj: Light_Dark_Strat<{ light: string; dark: string; system: string; custom: string[] }>) => {
//     // KEYS -------------------------------------------------

//     // Are all keys strings?
//     const are_all_keys_strings = Object.keys(obj.keys).every((k) => typeof k === 'string')
//     if (!are_all_keys_strings) warn('Func: validate_light_dark_mode - All keys must be strings.', obj.keys)

//     const keys = Object.values(obj.keys).flat()
//     const unique_keys = new Set(keys)

//     // Are all different keys?
//     const are_all_different = keys.length === unique_keys.size
//     if (!are_all_different) warn('Func: validate_light_dark_mode - "light", "dark", "system" and "custom" keys must be different.', obj.keys)

//     // Are "keys.light" and "keys.dark" keys provided?
//     const is_light_dark_provided = obj.keys.light && obj.keys.dark
//     if (!is_light_dark_provided) warn('Func: validate_light_dark_mode - "light" and "dark" keys must be provided.', obj.keys)

//     // Is "keys.system" provided only if "enableSystem" is true?
//     // @ts-expect-error - "keys.system" should'nt be provided if "enableSystem" is false
//     const is_system_key_wrongly_provided = !obj.enableSystem && obj.keys.system
//     if (is_system_key_wrongly_provided) warn('Func: validate_light_dark_mode - "keys.system" should not be provided if "enableSystem" is false.', obj)

//     // Is "keys.custom" key not empty?
//     const is_one_custom_provided = obj.keys.custom && obj.keys.custom.length > 0
//     if (!is_one_custom_provided) warn('Func: validate_light_dark_mode - "custom" key must contain at least one mode.', obj.keys)

//     // ENABLE SYSTEM -------------------------------------------------

//     // Is "enableSystem" provided?
//     const is_enable_system_provided = obj.enableSystem !== undefined
//     if (!is_enable_system_provided) warn('Func: validate_light_dark_mode - "enableSystem" key must be provided.', obj)

//     // Is "enableSystem" a boolean?
//     const is_enable_system_boolean = typeof obj.enableSystem === 'boolean'
//     if (!is_enable_system_boolean) warn('Func: validate_light_dark_mode - "enableSystem" key must be a boolean.', obj)

//     // DEFAULT -------------------------------------------------------

//     // Is "default" key provided?
//     const is_default_provided = obj.default !== undefined
//     if (!is_default_provided) warn('Func: validate_light_dark_mode - "default" key must be provided.', obj)

//     // Is "default" key a string?
//     const is_default_string = typeof obj.default === 'string'
//     if (!is_default_string) warn('Func: validate_light_dark_mode - "default" key must be a string.', obj)

//     // Is "default" key one of the provided values?
//     const is_valid_default = unique_keys.has(obj.default)
//     if (!is_valid_default)
//       warn('Func: validate_light_dark_mode - "default" key must be one of the provided values in "keys".', { default: obj.default, keys: obj.keys })

//     // FALLBACK -------------------------------------------------------

//     // Is "fallback" key provided only if "enableSystem" is true?
//     // @ts-expect-error - "fallback" should'nt be provided if "enableSystem" is false
//     const is_fallback_wrongly_provided = !obj.enableSystem && obj.fallback
//     if (is_fallback_wrongly_provided) warn('Func: validate_light_dark_mode - "fallback" key should not be provided if "enableSystem" is false.', obj)

//     // Is "fallback" key a string (if provided)?
//     const is_fallback_string = !obj.enableSystem || (obj.enableSystem && typeof obj.fallback === 'string')
//     if (!is_fallback_string) warn('Func: validate_light_dark_mode - "fallback" key must be a string.', obj)

//     // Is "fallback" key one of the provided values (except "system" key)?
//     const non_system_keys = Array.from(unique_keys).filter((k) => (obj.enableSystem ? k !== obj.keys.system : true)) // Every key except "system" (if enabled)
//     const is_invalid_fallback = obj.enableSystem && !non_system_keys.includes(obj.fallback) // Invalid if "fallback" key is not one of the provided values (excluding "system" key)
//     if (is_invalid_fallback)
//       warn('Func: validate_light_dark_mode - "fallback" key must be one of the provided values in "keys" (but not "keys.system").', {
//         fallback: obj.fallback,
//         keys: obj.keys,
//       })
//   }

//   // ---------------------------------------------------------------------

//   for (const strat_obj of Object.values(config)) {
//     if (strat_obj.strategy === STRATS.mono) validate_mono_strat(strat_obj)
//     else if (strat_obj.strategy === STRATS.multi) validate_multi_strat(strat_obj)
//     else if (strat_obj.strategy === STRATS.custom) validate_custom_strat(strat_obj)
//     else if (strat_obj.strategy === STRATS.light_dark) validate_light_dark_mode(strat_obj)
//   }
// }

// // #endregion
