import { Prop } from './types/index'
import { Available_Values, Default_Values, Handled_Props, Script_Params, Set_SVs, Set_TAs, Storage_Values, SVs_Sanitization } from './types/script'
import { Nullable, UndefinedOr } from './types/utils'

export function script({ config_SK, mode_SK, config, constants: { STRATS, MODES, COLOR_SCHEMES } }: Script_Params) {
  const html = document.documentElement

  const handled_props = get_handled_props()
  const available_values = get_available_values()
  const default_values = get_default_values()

  // #region HELPERS --------------------------------------------------------------------------------
  function parse_JsonToMap(string: Nullable<string>): Map<string, string> {
    const map = new Map<string, string>()
    const empty_map = new Map<string, string>()
    
    if (typeof string !== 'string' || string.trim() === '') return empty_map

    try {
      const result = JSON.parse(string)
      if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
        for (const key in result) {
          if (typeof key !== 'string' || typeof result[key] !== 'string') continue
          map.set(key, result[key])
        }
        return map
      }
    } catch (error) {
      return empty_map
    }

    return empty_map
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
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE VALUES (SVs) -------------------------------------------------------------------
  // #region STORAGE VALUES - getter ----------------------------------------------------------------
  function get_SVs() {
    const storage_string = localStorage.getItem(config_SK)
    return parse_JsonToMap(storage_string)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE VALUES - sanitizer ------------------------------------------------------------
  function sanitize_SVs(prov_values: ReturnType<typeof get_SVs>): SVs_Sanitization {
    const values: SVs_Sanitization['values'] = new Map()

    for (const [prop, default_value] of default_values) {
      const available_prop_values = available_values.get(prop) as NonNullable<ReturnType<(typeof available_values)['get']>>
      values.set(prop, { prop, was_provided: false, is_handled: true, value: undefined, was_valid: false, sanitized_value: default_value, is_fallback: true, available_values: available_prop_values, default_value })
    }

    for (const [prop, value] of prov_values) {
      if (!is_handled_prop(prop)) {
        values.set(prop, { prop, was_provided: true, is_handled: false, value, was_valid: undefined, sanitized_value: undefined, is_fallback: undefined, available_values: undefined, default_value: undefined })
        continue
      }

      const handled_prop = prop as Prop
      const available_prop_values = available_values.get(handled_prop) as NonNullable<ReturnType<(typeof available_values)['get']>>
      const default_value = default_values.get(handled_prop) as NonNullable<ReturnType<(typeof default_values)['get']>>
      if (!is_available_value(handled_prop, value)) {
        values.set(handled_prop, { prop, was_provided: true, is_handled: true, value, was_valid: false, sanitized_value: default_value, is_fallback: true, available_values: available_prop_values, default_value })
        continue
      }

      values.set(prop, { prop, was_provided: true, is_handled: true, value, was_valid: true, sanitized_value: value, is_fallback: false, available_values: available_prop_values, default_value })
    }

    const were_all_valid = Array.from(values.values()).every((i) => i.was_valid)
    return { handled_props, performed_on: prov_values, values, were_all_valid }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE VALUES - setter ----------------------------------------------------------------
  function set_SVs(provided_values: ReturnType<typeof get_SVs>): Set_SVs {
    const values: Set_SVs['values'] = new Map()
    const storage_values: Storage_Values = new Map()
    const updated_values: Set_SVs['updated_values'] = new Map()

    const curr_values = sanitize_SVs(get_SVs()).values
    const old_values = new Map(
      Array.from(curr_values)
        .filter(([prop, { was_provided }]) => was_provided)
        .map(([prop, { value }]) => [prop, value])
    )

    // Instantiate handled props with default values (so that can be passed only values to update)
    for (const [prop, default_value] of default_values) {
      const available_prop_values = available_values.get(prop) as NonNullable<ReturnType<(typeof available_values)['get']>>
      const old_value = curr_values.get(prop)?.value
      const old_valid = curr_values.get(prop)?.was_valid ?? false
      const got_updated = !old_valid || (old_valid && old_value !== default_value)
      const was_same = !old_value

      values.set(prop, { prop, was_provided: false, is_handled: true, old: { value: old_value, was_valid: old_valid }, new: { value: undefined, was_valid: undefined }, was_same, updated_value: default_value, got_updated, is_fallback: true, available_values: available_prop_values, default_value })
      storage_values.set(prop, default_value)
      if (got_updated) updated_values.set(prop, default_value)
    }

    // Prioritize provided values over default values to use for update
    for (const [prop, value] of provided_values) {
      const old_value = curr_values.get(prop)?.value
      const old_valid = curr_values.get(prop)?.was_valid ?? false
      const was_same = old_value === value

      if (!is_handled_prop(prop)) {
        values.set(prop, { prop, was_provided: true, is_handled: false, old: { value: old_value, was_valid: undefined }, new: { value, was_valid: undefined }, was_same, updated_value: undefined, got_updated: undefined, is_fallback: undefined, available_values: undefined, default_value: undefined })
        continue
      }

      const handled_prop = prop as Prop
      const available_prop_values = available_values.get(handled_prop) as NonNullable<ReturnType<(typeof available_values)['get']>>
      const default_value = default_values.get(handled_prop) as NonNullable<ReturnType<(typeof default_values)['get']>>

      if (!is_available_value(handled_prop, value)) {
        const got_updated = !old_valid || (old_valid && old_value !== default_value)
        values.set(handled_prop, { prop: handled_prop, was_provided: true, is_handled: true, old: { value: old_value, was_valid: old_valid }, new: { value, was_valid: false }, was_same, updated_value: default_value, got_updated, is_fallback: true, available_values: available_prop_values, default_value })
        storage_values.set(handled_prop, default_value)
        if (got_updated) updated_values.set(handled_prop, default_value)
        continue
      }

      const got_updated = !old_valid || (old_valid && old_value !== value)
      const is_fallback = value === default_value

      values.set(handled_prop, { prop: handled_prop, was_provided: true, is_handled: true, old: { value: old_value, was_valid: old_valid }, new: { value, was_valid: true }, was_same, updated_value: value, is_fallback, got_updated, available_values: available_prop_values, default_value })
      storage_values.set(handled_prop, value)
      if (got_updated) updated_values.set(handled_prop, value)
    }

    // Update storage values if there are values that need to be updated
    const executed_update = Array.from(values.values()).some((i) => i.got_updated)
    if (executed_update) localStorage.setItem(config_SK, JSON.stringify(Object.fromEntries(storage_values)))

    return { handled_props, values, executed_update, old_values, updated_values, provided_values }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #endregion -------------------------------------------------------------------------------------
  // #region THEME ATTRIBUTES (TAs) -----------------------------------------------------------------
  // #region THEME ATTRIBUTES - getter -------------------------------------------------------------
  function get_TA(prop: Prop): Nullable<string> {
    return html.getAttribute(`data-${prop}`)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region THEME ATTRIBUTES - setter --------------------------------------------------------------
  function set_TAs(provided_values: ReturnType<typeof get_SVs>): Set_TAs {
    return {}
  }
  // #endregion -------------------------------------------------------------------------------------
  // #endregion -------------------------------------------------------------------------------------
  // #region INITIALIZATION -------------------------------------------------------------------------
  function init() {
    const retrieved_values = get_SVs()
    set_SVs(retrieved_values)
  }
  // #endregion -------------------------------------------------------------------------------------

  init()
}
