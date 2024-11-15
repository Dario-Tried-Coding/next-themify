import { Color_Scheme as CS } from './constants'
import { Available_Values, Color_Schemes, Default_Values, Script_Params } from './types/script'
import { Nullable, UndefinedOr } from './types/utils'

export function script({ config_SK, mode_SK, constants: { STRATS, MODES, COLOR_SCHEMES }, config }: Script_Params) {
  const html = document.documentElement

  

  // #region HELPERS ---------------------------------------------------------------------------------------

  function parse_JsonToObj(string: Nullable<string>): UndefinedOr<Record<string, any>> {
    if (typeof string !== 'string' || string.trim() === '') return undefined

    try {
      const result = JSON.parse(string)
      if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
        for (const key in result) {
          if (typeof key !== 'string') {
            return undefined
          }
        }
        return result
      }
    } catch (error) {
      return undefined
    }
  }

  function isSameObj(obj1: Nullable<Record<string, any>>, obj2: Nullable<Record<string, any>>) {
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

  // #region UTILS -----------------------------------------------------------------------------------------

  const construct_available_values = (): Available_Values => {
    const available_values: Available_Values = new Map<keyof typeof config, Set<string>>()

    for (const [key, strat_obj] of Object.entries(config)) {
      const t_key = key as keyof typeof config

      if (strat_obj.strategy === 'mono') available_values.set(t_key, new Set([strat_obj.key]))
      else if (strat_obj.strategy === 'multi') available_values.set(t_key, new Set(strat_obj.keys))
      else if (strat_obj.strategy === 'custom') available_values.set(t_key, new Set(strat_obj.keys.map((i) => i.key)))
      else if (strat_obj.strategy === 'light_dark')
        available_values.set(
          t_key,
          new Set(
            Object.values(strat_obj.keys)
              .flat()
              .map((i) => (typeof i === 'string' ? i : i.key))
          )
        )
    }

    return available_values
  }

  const construct_default_values = (): Default_Values => {
    const default_values: Default_Values = new Map<keyof typeof config, string>()

    for (const [key, value] of Object.entries(config)) {
      const t_key = key as keyof typeof config

      if (value.strategy === STRATS.mono) default_values.set(t_key, value.key)
      else default_values.set(t_key, value.default)
    }

    return default_values
  }

  const construct_color_schemes = (): Color_Schemes => {
    const CSs: Color_Schemes = new Map<string, CS>()

    if (!config.mode) return CSs

    if (config.mode.strategy === STRATS.mono) CSs.set(config.mode.key, config.mode.colorScheme)
    else if (config.mode.strategy === STRATS.custom) config.mode.keys.forEach((i) => CSs.set(i.key, i.colorScheme))
    else if (config.mode.strategy === STRATS.light_dark) {
      Object.entries(config.mode.keys).forEach(([key, value]) => {
        if (typeof value !== 'string') value.forEach((i) => CSs.set(i.key, i.colorScheme))
        else if (COLOR_SCHEMES.includes(key as CS)) CSs.set(key, key as CS)
      })
    }

    return CSs
  }

  // #endregion
}
