// @ts-check

/**
 * @typedef {import('./constants').STATIC} STATIC
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
    constants: { STRATS },
  } = params

  let init_library = true

  const valid_values = construct_valid_values()

  // #region HELPERS
  /** @param {string} str */
  function capitalize(str) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }
  // #endregion

  // #region UTILS
  function construct_valid_values() {
    /** @type {Partial<Record<Prop, Set<string>>>} */
    const valid_values = {}

    for (const [key, value] of Object.entries(config)) {
      if (!(key in config)) continue
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
  // #endregion

  // #region CONFIG VALIDATION
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
      return warn('Mode validation: "light" and "dark" keys must be different', { keys: { light: obj.keys.light, dark: obj.keys.dark } })
    if (obj.enableSystem && !obj.keys.system) return warn('Mode validation: "system" key must be provided if "system" is enabled', { keys: obj.keys })
    if (obj.enableSystem && (obj.keys.system === obj.keys.light || obj.keys.system === obj.keys.dark))
      return warn('Mode validation: "system" key must be different from "light" and "dark" keys', { keys: obj.keys })
    if (obj.keys.custom && obj.keys.custom.length === 0)
      return warn('Mode validation: at least one "custom" key must be provided', { keys: obj.keys.custom })
    if (!valid_values['mode']?.has(obj.default))
      return warn('Mode validation: "default" key must be one of the provided keys', { keys: obj.keys, default: obj.default })
    if (obj.enableSystem && obj.fallback === obj.keys.system)
      return warn('Mode validation: "fallback" key must be different from "system" key', {
        keys: { system: obj.keys.system },
        fallback: obj.fallback,
      })
  }

  function validate_config() {
    for (const [key, strat_obj] of Object.entries(config)) {
      if (!(key in config)) continue
      const typed_key = /** @type {Prop} */ (key)

      if (strat_obj.strategy === STRATS.mono) continue
      else if (strat_obj.strategy === STRATS.multi || strat_obj.strategy === STRATS.custom) validate_multi_strat(strat_obj, typed_key)
      else if (strat_obj.strategy === STRATS.light_dark) validate_light_dark_mode_strat(strat_obj)
    }
  }
  // #endregion

  validate_config()
}
