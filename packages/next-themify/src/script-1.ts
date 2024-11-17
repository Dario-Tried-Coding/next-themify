import { Color_Scheme as CS } from './constants'
import { Prop } from './types/index'
import { Available_Values, Color_Schemes, Default_Values, SC, SC_Validation, Script_Params, Set_SC, Set_TAs, TA_Validation } from './types/script'
import { Nullable, UndefinedOr } from './types/utils'

export function script({ config_SK, mode_SK, constants: { STRATS, MODES, COLOR_SCHEMES }, config }: Script_Params) {
  // #region HELPERS ---------------------------------------------------------------------------------------

  /** Handles undefined | null too... */
  function parse_JsonToMap(string: Nullable<string>): UndefinedOr<Map<string, string>> {
    if (typeof string !== 'string' || string.trim() === '') return undefined

    const map = new Map<string, string>()

    try {
      const result = JSON.parse(string)
      if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
        for (const key in result) {
          if (typeof key !== 'string' || typeof result[key] !== 'string') return undefined
          map.set(key, result[key])
        }
        return map
      }
    } catch (error) {
      return undefined
    }
  }

  const is_SameMap = (map1: Map<any, any>, map2: Map<any, any>) => {
    if (!(map1 instanceof Map) || !(map2 instanceof Map)) return false
    if (map1.size !== map2.size) return false

    for (const [key, value] of map1) {
      if (!map2.has(key)) return false

      const otherValue = map2.get(key)
      if (value instanceof Map && otherValue instanceof Map) {
        if (!is_SameMap(value, otherValue)) return false
      } else if (value !== otherValue) return false
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

  /** Overrides default values of only the handled props. */
  const merge_SCs = (...SCs: Nullable<SC>[]): SC => {
    const merged_SC: SC = default_values

    for (const SC of SCs) {
      if (!SC) continue
      for (const prop of handled_props) {
        if (SC.has(prop)) merged_SC.set(prop, SC.get(prop) as string)
      }
    }

    return merged_SC
  }

  const validate_SC = (string: Nullable<string>, opts?: { fallback_SC?: SC }): SC_Validation => {
    const fallback_values = merge_SCs(opts?.fallback_SC)

    const parsed_map = parse_JsonToMap(string)
    if (!parsed_map) return { results: undefined, valid: false, performed_on: string, fallback_values, available_values, valid_SC: fallback_values }

    const results: NonNullable<SC_Validation['results']> = new Map()
    const valid_SC: SC = new Map()
    let valid = true

    for (const [prop, value] of parsed_map) {
      if (!handled_props.has(prop as Prop)) {
        results.set(prop, { is_handled: false, value, valid: false })
        valid = false
        continue
      }

      const handled_prop = prop as Prop
      if (!available_values.get(handled_prop)?.has(value)) {
        results.set(handled_prop, { is_handled: true, value, valid: false })
        valid_SC.set(handled_prop, fallback_values.get(handled_prop) as string)
        valid = false
        continue
      }

      results.set(handled_prop, { is_handled: true, value, valid: true })
      valid_SC.set(handled_prop, value)
    }

    for (const prop of handled_props) {
      if (valid_SC.has(prop)) continue
      valid_SC.set(prop, fallback_values.get(prop) as string)
      valid = false
    }

    return { results, fallback_values, valid, performed_on: string, available_values, valid_SC }
  }

  const get_SC = (opts?: { fallback_SC?: SC }): SC_Validation => validate_SC(localStorage.getItem(config_SK), opts)

  const set_SC = (SC: SC, opts?: { force?: boolean }): Set_SC => {
    const retrieved_SC = get_SC()

    const is_valid = retrieved_SC.valid
    const is_same = is_SameMap(SC, retrieved_SC.valid_SC)

    if (is_valid && is_same && !opts?.force) return { must_update: false, retrieved_SC, received_SC: SC }

    localStorage.setItem(config_SK, JSON.stringify(Object.fromEntries(SC)))
    return { must_update: true, retrieved_SC, received_SC: SC }
  }
  // #endregion

  // #region THEME ATTRIBUTES (TAs) -----------------------------------------------------------------------
  const validate_TA = ({ prop, value }: { prop: Nullable<string>; value: Nullable<string> }, opts?: { fallback_value?: string }): TA_Validation => {
    if (!prop || !handled_props.has(prop as Prop))
      return { results: { prop, is_handled: false, value, valid: false }, valid: false, valid_TA: undefined, available_values: undefined, fallback_value: undefined }

    const fallback_value = opts?.fallback_value ?? (default_values.get(prop as Prop) as string)
    const available_TA_values = available_values.get(prop as Prop) as Set<string>

    if (!value || !available_TA_values.has(value))
      return { results: { prop, is_handled: true, value, valid: false }, valid: false, valid_TA: { prop: prop as Prop, value: fallback_value }, available_values: available_TA_values, fallback_value }

    return { results: { prop, is_handled: true, value, valid: true }, valid: true, valid_TA: { prop: prop as Prop, value }, available_values: available_TA_values, fallback_value }
  }

  const get_TA = (prop: Prop, opts?: { fallback_value?: string }): TA_Validation => validate_TA({ prop, value: html.getAttribute(`data-${prop}`) }, opts)

  const set_TAs = (SC: SC, opts?: { force?: boolean }): Set_TAs => {
    const info: Set_TAs = new Map()

    for (const [prop, value] of SC) {
      const retrieved_TA = get_TA(prop)

      const is_valid = retrieved_TA.valid
      const is_same = retrieved_TA.results.value === value
      if (is_valid && is_same && !opts?.force) {
        info.set(prop, { must_update: false, received_TA: { prop, value }, retrieved_TA })
        continue
      }

      html.setAttribute(`data-${prop}`, value)
      info.set(prop, {must_update: true, received_TA: { prop, value }, retrieved_TA })
    }

    return info
  }

  // #endregion

  // #region INITIALIZATION --------------------------------------------------------------------------------

  const apply_SC = (SC: SC) => {
    set_TAs(SC)
    set_SC(SC)
  }

  const init = () => {
    const retrieved_SC = get_SC()
    apply_SC(retrieved_SC.valid_SC)
  }

  init()

  // #endregion
}
