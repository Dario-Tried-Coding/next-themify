/** @param {import('./types/script').Script_Params} params */
export function script(params) {
  const html = document.documentElement
  const {
    config_SK,
    config,
    constants: { STRATS },
  } = params

  const DEFAULT_SC = construct_DefaultSC()
  const VALID_VALUES = construct_Valid_Values()

  // #region UTILS
  function construct_DefaultSC() {
    /** @type {Storage_Config} */ // @ts-ignore
    const default_ST = {}

    for (const [key, value] of Object.entries(config)) {
      if (value.strategy === STRATS.mono) Object.assign(default_ST, { [key]: value.key })
      else Object.assign(default_ST, { [key]: value.default })
    }

    return default_ST
  }

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
  // #endregion

}
