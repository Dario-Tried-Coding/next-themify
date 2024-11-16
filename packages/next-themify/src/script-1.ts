import { Color_Scheme as CS } from './constants'
import { Prop } from './types/index'
import { Available_Values, Color_Schemes, Default_Values, SC, SC_Validation, Script_Params, Set_SC, Set_TAs, TA_Validation } from './types/script'
import { Nullable, UndefinedOr } from './types/utils'

export function script({ config_SK, mode_SK, constants: { STRATS, MODES, COLOR_SCHEMES }, config }: Script_Params) {
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

  const construct_handled_props = () => new Set(Object.keys(config) as (keyof typeof config)[])

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

  const html = document.documentElement

  const handled_props = construct_handled_props()
  const available_values = construct_available_values()
  const default_values = construct_default_values()
  const color_schemes = construct_color_schemes()

  // #region STORAGE CONFIG (SC) ---------------------------------------------------------------------------

  const merge_SCs = (...SCs: Nullable<SC>[]): SC => {
    const merged_SC: SC = Object.fromEntries(default_values)

    for (const SC of SCs) {
      if (!SC) continue
      for (const prop of handled_props) {
        if (prop in SC) merged_SC[prop] = SC[prop]
      }
    }

    return merged_SC
  }

  const validate_SC = (unsafe_string: Nullable<string>, opts?: { fallback_SC?: SC }): SC_Validation => {
    const fallback_SC = merge_SCs(opts?.fallback_SC)

    const parsed_obj = parse_JsonToObj(unsafe_string)
    if (!parsed_obj) return { SC: fallback_SC, valid: false, results: new Map(), performed_on: { string: unsafe_string, obj: parsed_obj }, available_values }

    const obj_to_validate = { ...parsed_obj }
    const results: SC_Validation['results'] = new Map()
    let valid = true

    for (const [unsafe_prop, unsafe_value] of Object.entries(obj_to_validate)) {
      if (!handled_props.has(unsafe_prop as keyof typeof config)) {
        results.set(unsafe_prop, [false, unsafe_value, false])
        delete obj_to_validate[unsafe_prop]
        valid = false
        continue
      }

      const curr_handled_prop = unsafe_prop as keyof typeof config
      if (!available_values.get(curr_handled_prop)?.has(unsafe_value)) {
        results.set(curr_handled_prop, [true, unsafe_value, false])
        obj_to_validate[curr_handled_prop] = fallback_SC[curr_handled_prop]
        valid = false
        continue
      }

      const valid_value = unsafe_value as string
      results.set(curr_handled_prop, [true, valid_value, true])
    }

    for (const prop of handled_props) {
      if (prop in obj_to_validate) continue
      obj_to_validate[prop] = fallback_SC[prop]
      valid = false
    }

    const SC = obj_to_validate as SC
    return { SC, valid, performed_on: { string: unsafe_string, obj: parsed_obj }, available_values, results }
  }

  const get_SC = (opts?: { fallback_SC?: SC }): SC_Validation => validate_SC(localStorage.getItem(config_SK), opts)

  const set_SC = (SC: SC, opts?: { force?: boolean }): Set_SC => {
    const retrieved_SC = get_SC()

    const is_same = isSameObj(SC, retrieved_SC.SC)
    if (is_same && !opts?.force) return { must_update: false, retrieved_SC, provided_SC: SC, is_same }

    localStorage.setItem(config_SK, JSON.stringify(SC))
    return { must_update: true, retrieved_SC, provided_SC: SC, is_same }
  }
  // #endregion

  // #region THEME ATTRIBUTES (TAs) -----------------------------------------------------------------------

  const validate_TA = ({ prop, value }: { prop: Nullable<string>; value: Nullable<string> }, opts?: { fallback_value?: string }): TA_Validation => {
    if (!prop || !handled_props.has(prop as keyof typeof config))
      return {
        TA: { prop: { value: prop, valid: false }, value: { value, valid: false } },
        fallback_value: undefined,
        available_values: new Set(),
      }

    const handled_prop = prop as keyof typeof config
    const fallback_value = opts?.fallback_value ?? (default_values.get(prop as keyof typeof config) as string)
    const available_TA_values = available_values.get(handled_prop) as Set<string>

    if (!value || !available_TA_values.has(value))
      return {
        TA: { prop: { value: handled_prop, valid: true }, value: { value, valid: false } },
        fallback_value,
        available_values: available_TA_values,
      }

    const available_value = value as string
    return {
      TA: { prop: { value: handled_prop, valid: true }, value: { value: available_value, valid: true } },
      fallback_value,
      available_values: available_TA_values,
    }
  }

  const get_TA = (prop: Prop, opts?: { fallback_value?: string }): TA_Validation => validate_TA({ prop, value: html.getAttribute(`data-${prop}`) }, opts)

  const set_TAs = (SC: SC, opts?: { force?: boolean }): Set_TAs => {
    const info: Set_TAs = {}

    for (const [prop, value] of Object.entries(SC)) {
      const t_prop = prop as keyof typeof config
      const available_TA_values = available_values.get(t_prop) as Set<string>
      const retrieved_TA = get_TA(t_prop)

      const is_valid = retrieved_TA.TA.value.valid
      const is_same = retrieved_TA.TA.value.valid && retrieved_TA.TA.value.value === value
      if (is_valid && is_same && !opts?.force) {
        info[t_prop] = { must_update: false, is_same, retrieved_value: retrieved_TA.TA.value, received_value: value, available_values: available_TA_values }
        continue
      }

      html.setAttribute(`data-${t_prop}`, value)
      info[t_prop] = { must_update: true, is_same, retrieved_value: retrieved_TA.TA.value, received_value: value, available_values: available_TA_values }
    }

    return info
  }

  // #endregion
}
