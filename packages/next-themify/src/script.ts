import { HVs_Sanitization, HVs_Update, Script_Params } from './types/script'
import { Nullable } from './types/utils'

export function script({ config_SK, mode_SK, config, constants: { STRATS, MODES, COLOR_SCHEMES } }: Script_Params) {
  const html = document.documentElement

  const handled_props = get_handled_props()
  const available_values = get_available_values()
  const default_values = get_default_values()

  // #region HELPERS --------------------------------------------------------------------------------
  function parse_JsonToMappedValues(string: Nullable<string>): Map<string, string> {
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
  // #region UTILS - handled props -----------------------------------------------------------------
  function get_handled_props() {
    return new Set(Object.keys(config))
  }
  function is_handled_prop(prop: Nullable<string>) {
    if (!prop) return false
    return handled_props.has(prop)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - available values ---------------------------------------------------------------
  function get_available_values() {
    const available_values: Map<string, Set<string>> = new Map()
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
  function is_available_value(prop: string, value: Nullable<string>) {
    if (!value) return false
    return (available_values.get(prop) as NonNullable<ReturnType<(typeof available_values)['get']>>).has(value)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - default values -----------------------------------------------------------------
  function get_default_values() {
    const default_values: Map<string, string> = new Map()
    for (const [key, value] of Object.entries(config)) {
      if (value.strategy === STRATS.mono) default_values.set(key, value.key)
      else default_values.set(key, value.default)
    }
    return default_values
  }
  function is_default_value(prop: string, value: Nullable<string>) {
    if (!value) return false
    return default_values.get(prop) === value
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region HANDLED VALUES - sanitizer ------------------------------------------------------------
  function sanitize_HVs(prov_values: Map<string, string>): HVs_Sanitization {
    const values: HVs_Sanitization['values'] = new Map()
    const missing_props = new Set(Array.from(handled_props).filter((i) => !prov_values.has(i)))

    for (const [prop, value] of prov_values) {
      if (!is_handled_prop(prop)) {
        values.set(prop, { prop, was_provided: true, is_handled: false, value, is_valid: undefined, sanitized_value: undefined, is_fallback: undefined, available_values: undefined, default_value: undefined })
        continue
      }

      const available_prop_values = available_values.get(prop) as NonNullable<ReturnType<(typeof available_values)['get']>>
      const default_value = default_values.get(prop) as NonNullable<ReturnType<(typeof default_values)['get']>>
      if (!is_available_value(prop, value)) {
        values.set(prop, { prop, was_provided: true, is_handled: true, value, is_valid: false, sanitized_value: default_value, is_fallback: true, available_values: available_prop_values, default_value })
        continue
      }

      values.set(prop, { prop, was_provided: true, is_handled: true, value, is_valid: true, sanitized_value: value, is_fallback: false, available_values: available_prop_values, default_value })
    }

    const are_all_valid = Array.from(values.values()).every((i) => i.is_valid)
    return { handled_props, available_values, default_values, performed_on: prov_values, values, are_all_valid, missing_props }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region HANDLED VALUES - updater ---------------------------------------------------------------
  function update_HVs({ provided_values, current_values, setter }: { provided_values: Map<string, string>; current_values: Map<string, string>; setter: (Handled_Values: Map<string, string>) => void }): HVs_Update {
    const values: HVs_Update['values'] = new Map()
    const handled_values: Map<string, string> = new Map()
    const updated_values: HVs_Update['updated_values'] = new Map()

    const { values: curr_values } = sanitize_HVs(current_values)

    // Instantiate handled props with default values (so that can be passed only values to update)
    for (const [prop, default_value] of default_values) {
      const available_prop_values = available_values.get(prop) as NonNullable<ReturnType<(typeof available_values)['get']>>
      const old_value = curr_values.get(prop)?.value
      const old_valid = curr_values.get(prop)?.is_valid
      const new_value = provided_values.get(prop)
      const got_updated = !old_valid || (old_valid && !new_value && old_value !== default_value)
      const was_same = !old_value

      values.set(prop, { prop, was_provided: false, is_handled: true, old: { value: old_value, was_valid: old_valid }, new: { value: undefined, was_valid: undefined }, was_same, updated_value: default_value, got_updated, is_fallback: true, available_values: available_prop_values, default_value })
      handled_values.set(prop, default_value)
      if (got_updated) updated_values.set(prop, default_value)
    }

    // Prioritize provided values over default values to use for update
    for (const [prop, value] of provided_values) {
      const old_value = curr_values.get(prop)?.value
      const old_valid = curr_values.get(prop)?.is_valid
      const was_same = old_value === value

      // If not handled, just record analysis
      if (!is_handled_prop(prop)) {
        values.set(prop, { prop, was_provided: true, is_handled: false, old: { value: old_value, was_valid: undefined }, new: { value, was_valid: undefined }, was_same, updated_value: undefined, got_updated: undefined, is_fallback: undefined, available_values: undefined, default_value: undefined })
        continue
      }

      const available_prop_values = available_values.get(prop) as NonNullable<ReturnType<(typeof available_values)['get']>>
      const default_value = default_values.get(prop) as NonNullable<ReturnType<(typeof default_values)['get']>>

      // If not valid value, fallback to default value
      if (!is_available_value(prop, value)) {
        const got_updated = !old_valid || (old_valid && old_value !== default_value)
        values.set(prop, { prop: prop, was_provided: true, is_handled: true, old: { value: old_value, was_valid: old_valid }, new: { value, was_valid: false }, was_same, updated_value: default_value, got_updated, is_fallback: true, available_values: available_prop_values, default_value })
        handled_values.set(prop, default_value)
        if (got_updated) updated_values.set(prop, default_value)
        continue
      }

      const got_updated = !old_valid || (old_valid && old_value !== value)
      const is_fallback = value === default_value

      // If valid value, use that for update
      values.set(prop, { prop: prop, was_provided: true, is_handled: true, old: { value: old_value, was_valid: old_valid }, new: { value, was_valid: true }, was_same, updated_value: value, is_fallback, got_updated, available_values: available_prop_values, default_value })
      handled_values.set(prop, value)
      if (got_updated) updated_values.set(prop, value)
    }

    const executed_update = Array.from(values.values()).some((i) => i.got_updated)
    if (executed_update) setter(handled_values)

    return { handled_props, available_values, default_values, values, executed_update, old_values: current_values, updated_values, provided_values }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE VALUES - retriever -------------------------------------------------------------
  function retrieve_SVs() {
    const storage_string = localStorage.getItem(config_SK)
    return parse_JsonToMappedValues(storage_string)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE VALUES - updater ---------------------------------------------------------------
  function update_SVs(provided_values: Map<string, string>) {
    const current_values = retrieve_SVs()
    const setter: Parameters<typeof update_HVs>[0]['setter'] = (handled_values) => localStorage.setItem(config_SK, JSON.stringify(Object.fromEntries(handled_values)))
    return update_HVs({ provided_values, current_values, setter })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region THEME ATTRIBUTES - retriever -----------------------------------------------------------
  function retrieve_TAs() {
    const retrieved_TAs: Map<string, string> = new Map()

    handled_props.forEach(prop => {
      const name = `data-${prop}`
      const value = html.getAttribute(name)
      if (value) retrieved_TAs.set(prop, value)
    })
    
    return retrieved_TAs
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region THEME ATTRIBUTES - updater -------------------------------------------------------------
  function update_TAs(provided_values: Map<string, string>) {
    const current_values = retrieve_TAs()
    const setter: Parameters<typeof update_HVs>[0]['setter'] = (handled_values) => {
      for (const [prop, value] of handled_values) {
        const name = `data-${prop}`
        html.setAttribute(name, value)
      }
    }
    return update_HVs({ provided_values, current_values, setter })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region INITIALIZATION -------------------------------------------------------------------------
  function init() {
    const retrieved_values = retrieve_SVs()
    update_SVs(retrieved_values)
    update_TAs(retrieved_values)
  }
  // #endregion -------------------------------------------------------------------------------------

  init()
}
