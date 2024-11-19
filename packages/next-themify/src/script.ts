import { Prop } from './types/index'
import { Available_Values, Default_Values, Fallback_Values, Handled_Props, Script_Params, Set_Storage_Values, Storage_Values, Storage_Values_Sanitization } from './types/script'
import { Nullable, UndefinedOr } from './types/utils'

export function script({ config_SK, mode_SK, config, constants: { STRATS, MODES, COLOR_SCHEMES } }: Script_Params) {
  const html = document.documentElement

  const handled_props = get_handled_props()
  const available_values = get_available_values()
  const default_values = get_default_values()
  const fallback_values = get_fallback_values()

  // #region HELPERS --------------------------------------------------------------------------------
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

  function is_SameMap(map1: Map<any, any>, map2: Map<any, any>) {
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
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS ----------------------------------------------------------------------------------
  // #region UTILS - handled props -----------------------------------------------------------------
  function get_handled_props(): Handled_Props {
    return new Set(Object.keys(config) as Prop[])
  }
  function is_handled_prop(prop: Nullable<string>) {
    if (!prop) return false
    return handled_props.has(prop as Prop)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - available values ---------------------------------------------------------------
  function get_available_values(): Available_Values {
    const available_values: Map<Prop, Set<string>> = new Map()
    for (const [prop, strat_obj] of Object.entries(config)) {
      const t_prop = prop as keyof typeof config

      if (strat_obj.strategy === STRATS.mono) available_values.set(t_prop, new Set([strat_obj.key]))
      else if (strat_obj.strategy === STRATS.custom) available_values.set(t_prop, new Set(strat_obj.keys.map((i) => i.key)))
      else if (strat_obj.strategy === STRATS.multi) available_values.set(t_prop, new Set(strat_obj.keys))
      else if (strat_obj.strategy === STRATS.light_dark)
        available_values.set(
          t_prop,
          new Set(
            Object.values(strat_obj.keys)
              .flat()
              .map((i) => (typeof i === 'string' ? i : i.key))
          )
        )
    }
    return available_values
  }
  function is_available_value(prop: Prop, value: Nullable<string>) {
    if (!value) return false
    return (available_values.get(prop) as NonNullable<ReturnType<(typeof available_values)['get']>>).has(value)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - default values -----------------------------------------------------------------
  function get_default_values(): Default_Values {
    const default_values: Map<Prop, string> = new Map()
    for (const [key, value] of Object.entries(config)) {
      const t_key = key as Prop

      if (value.strategy === STRATS.mono) default_values.set(t_key, value.key)
      else default_values.set(t_key, value.default)
    }
    return default_values
  }
  function is_default_value(prop: Prop, value: Nullable<string>) {
    if (!value) return false
    return default_values.get(prop) === value
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - fallback values ----------------------------------------------------------------
  function get_fallback_values(): Fallback_Values {
    const fallback_values: Map<Prop, string> = new Map()
    for (const [key, value] of Object.entries(config)) {
      const t_key = key as Prop

      if (value.strategy === STRATS.mono) fallback_values.set(t_key, value.key)
      else if (value.strategy === STRATS.custom || value.strategy === STRATS.multi) fallback_values.set(t_key, value.default)
      else if (value.strategy === STRATS.light_dark) {
        const fallback_value = value.enableSystem ? value.fallback : value.default
        fallback_values.set(t_key, fallback_value)
      }
    }
    return fallback_values
  }
  function is_fallback_value(prop: Prop, value: Nullable<string>) {
    if (!value) return false
    return fallback_values.get(prop) === value
  }
  // #endregion -------------------------------------------------------------------------------------
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE VALUES (SVs) -------------------------------------------------------------------
  function merge_SVs(...values: Nullable<Storage_Values>[]): Storage_Values {
    const merged_values = default_values

    for (const map of values) {
      if (!map) continue
      for (const prop of handled_props) {
        if (map.has(prop)) merged_values.set(prop, map.get(prop) as NonNullable<ReturnType<(typeof map)['get']>>)
      }
    }

    return merged_values
  }
  // #region STORAGE VALUES - sanitizer ------------------------------------------------------------
  function sanitize_SVs(values: UndefinedOr<Map<string, string>>): Storage_Values_Sanitization {
    let valid = true
    const results: NonNullable<Storage_Values_Sanitization['results']> = new Map()
    const sanitized_values: Storage_Values_Sanitization['sanitized_values'] = default_values

    if (!values) return { valid: false, results, sanitized_values, fallback_values: default_values, available_values, handled_props, performed_on: values }

    for (const [prop, value] of values) {
      const handled_prop = prop as typeof handled_props extends Set<infer T> ? T : never
      if (!handled_props.has(handled_prop)) {
        valid = false
        results.set(prop, { prop, is_handled: false, value, valid: false })
        continue
      }

      if (!available_values.get(handled_prop)?.has(value)) {
        valid = false
        results.set(prop, { prop, is_handled: true, value, valid: false })
        continue
      }

      results.set(prop, { prop, is_handled: true, value, valid: true })
      sanitized_values.set(handled_prop, value)
    }

    for (const prop of handled_props) {
      if (!values.has(prop)) {
        valid = false
        results.set(prop, { prop, is_handled: true, value: null, valid: false })
      }
    }

    return { results, valid, sanitized_values, fallback_values: default_values, available_values, handled_props, performed_on: values }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE VALUES - getter ----------------------------------------------------------------
  function get_SVs(): UndefinedOr<Map<string, string>> {
    const storage_string = localStorage.getItem(config_SK)
    return parse_JsonToMap(storage_string)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE VALUES - setter ----------------------------------------------------------------
  function set_SVs(values: Storage_Values): Set_Storage_Values {
    const info: Set_Storage_Values['info'] = new Map()
    const storage_values: Storage_Values = new Map()
    let must_update = false

    const { results } = sanitize_SVs(get_SVs())
    for (const prop of handled_props) {
      const retrieved_value = results?.get(prop)?.value
      const provided_value = values.get(prop) as NonNullable<ReturnType<(typeof values)['get']>>
      const available_values = get_available_values().get(prop) as NonNullable<ReturnType<ReturnType<typeof get_available_values>['get']>>
      const was_valid = results?.get(prop)?.valid ?? false
      const is_same = retrieved_value === provided_value
      const must_be_updated = !was_valid || (was_valid && !is_same)

      if (must_be_updated) {
        info.set(prop, { retrieved_value, provided_value, available_values, was_valid, is_same, updated: true })
        storage_values.set(prop, provided_value)
        must_update = true
        continue
      }

      info.set(prop, { retrieved_value, provided_value, available_values, was_valid, is_same, updated: false })
      storage_values.set(prop, retrieved_value as NonNullable<typeof retrieved_value>)
    }

    if (must_update) {
      localStorage.setItem(config_SK, JSON.stringify(Object.fromEntries(storage_values)))
      return { updated: true, updated_with: storage_values, info }
    }
    return { updated: false, sticked_with: values, info }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #endregion -------------------------------------------------------------------------------------
  // #region INITIALIZATION -------------------------------------------------------------------------
  function init() {
    const current_values = get_SVs()
    const { sanitized_values } = sanitize_SVs(current_values)
    set_SVs(sanitized_values)
  }

  // #endregion -------------------------------------------------------------------------------------

  init()
}
