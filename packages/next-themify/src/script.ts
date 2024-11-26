import { Color_Scheme } from './constants'
import { CS_Sanitization, HVs_Sanitization, HVs_Update, Script_Params, SM_Sanitization, SM_Update } from './types/script'
import { Nullable } from './types/utils'

export function script({ config_SK, mode_SK, config, constants: { STRATS, MODES, COLOR_SCHEMES } }: Script_Params) {
  const html = document.documentElement

  const handled_props = get_handled_props()
  const available_values = get_available_values()
  const default_values = get_default_values()
  const color_schemes = get_color_schemes()

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
  // #region UTILS - color schemes ------------------------------------------------------------------
  function get_color_schemes() {
    const color_schemes: Map<string, Color_Scheme> = new Map()
    if (config.mode?.strategy === STRATS.mono) color_schemes.set(config.mode.key, config.mode.colorScheme)
    else if (config.mode?.strategy === STRATS.custom) config.mode.keys.forEach(({ key, colorScheme }) => color_schemes.set(key, colorScheme))
    else if (config.mode?.strategy === STRATS.light_dark) {
      Object.entries(config.mode.keys).forEach(([key, i]) => {
        if (typeof i !== 'string') i.forEach(({ key, colorScheme }) => color_schemes.set(key, colorScheme))
        else if (COLOR_SCHEMES.includes(key as Color_Scheme)) color_schemes.set(i, key as Color_Scheme)
      })
    }
    return color_schemes
  }
  function get_color_scheme(mode: string) {
    if (!config.mode) return undefined
    return color_schemes.get(mode)
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
      const is_same = old_value === default_value

      values.set(prop, { prop, was_provided: false, is_handled: true, old: { value: old_value, was_valid: old_valid }, new: { value: undefined, was_valid: undefined }, is_same, was_same, updated_value: default_value, got_updated, is_fallback: true, available_values: available_prop_values, default_value })
      handled_values.set(prop, default_value)
      if (got_updated) updated_values.set(prop, default_value)
    }

    // Prioritize provided values over default values to use for update
    for (const [prop, value] of provided_values) {
      const old_value = curr_values.get(prop)?.value
      const old_valid = curr_values.get(prop)?.is_valid

      // If not handled, just record analysis
      if (!is_handled_prop(prop)) {
        const was_same = old_value === value
        const is_same = !old_value
        const got_updated = curr_values.has(prop)
        values.set(prop, { prop, was_provided: true, is_handled: false, old: { value: old_value, was_valid: undefined }, new: { value, was_valid: undefined }, is_same, was_same, updated_value: undefined, got_updated, is_fallback: undefined, available_values: undefined, default_value: undefined })
        continue
      }

      const available_prop_values = available_values.get(prop) as NonNullable<ReturnType<(typeof available_values)['get']>>
      const default_value = default_values.get(prop) as NonNullable<ReturnType<(typeof default_values)['get']>>

      // If not valid value, fallback to default value
      if (!is_available_value(prop, value)) {
        const got_updated = !old_valid || (old_valid && old_value !== default_value)
        const was_same = old_value === value
        const is_same = old_value === default_value
        values.set(prop, { prop: prop, was_provided: true, is_handled: true, old: { value: old_value, was_valid: old_valid }, new: { value, was_valid: false }, was_same, is_same, updated_value: default_value, got_updated, is_fallback: true, available_values: available_prop_values, default_value })
        handled_values.set(prop, default_value)
        if (got_updated) updated_values.set(prop, default_value)
        continue
      }

      const got_updated = !old_valid || (old_valid && old_value !== value)
      const is_fallback = value === default_value
      const was_same = old_value === value
      const is_same = old_value === value

      // If valid value, use that for update
      values.set(prop, { prop: prop, was_provided: true, is_handled: true, old: { value: old_value, was_valid: old_valid }, new: { value, was_valid: true }, is_same, was_same, updated_value: value, is_fallback, got_updated, available_values: available_prop_values, default_value })
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

    handled_props.forEach((prop) => {
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
  // #region STORAGE MODE - retriever ---------------------------------------------------------------
  function retrieve_SM() {
    return localStorage.getItem(mode_SK)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE MODE - sanitizer ---------------------------------------------------------------
  function sanitize_SM(value: Nullable<string>): SM_Sanitization {
    if (!config.mode) return { is_handled: false, value: undefined, is_valid: undefined, sanitized_value: undefined, default_value: undefined, is_fallback: undefined, available_values: undefined }

    const available_mode_values = available_values.get('mode') as NonNullable<ReturnType<(typeof available_values)['get']>>
    const default_value = default_values.get('mode') as NonNullable<ReturnType<(typeof default_values)['get']>>

    if (!value) return { is_handled: true, value: undefined, is_valid: undefined, sanitized_value: default_value, default_value, is_fallback: true, available_values: available_mode_values }
    if (!available_mode_values.has(value)) return { is_handled: true, value, is_valid: false, sanitized_value: default_value, default_value, is_fallback: true, available_values: available_mode_values }

    return { is_handled: true, value, is_valid: true, sanitized_value: value, default_value, is_fallback: false, available_values: available_mode_values }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE MODE - updater -----------------------------------------------------------------
  function update_SM(value: Nullable<string>): SM_Update {
    const { value: old_value, is_valid: is_old_valid, is_handled: is_old_handled } = sanitize_SM(retrieve_SM())
    const { value: new_value, is_valid: is_new_valid, is_handled: is_new_handled } = sanitize_SM(value)

    if (!is_old_handled || !is_new_handled) return { is_handled: false, old: { value: old_value, was_valid: is_old_valid }, new: { value: new_value, was_valid: is_new_valid }, updated_value: undefined, got_updated: undefined, was_same: old_value === new_value, is_same: !old_value, default_value: undefined, is_fallback: undefined, available_values: undefined }

    const available_mode_values = available_values.get('mode') as NonNullable<ReturnType<(typeof available_values)['get']>>
    const default_value = default_values.get('mode') as NonNullable<ReturnType<(typeof default_values)['get']>>

    if (!is_new_valid) {
      const got_updated = !is_old_valid || (is_old_valid && old_value !== default_value)
      if (got_updated) localStorage.setItem(mode_SK, default_value)
      return { is_handled: true, old: { value: old_value, was_valid: is_old_valid }, new: { value: new_value, was_valid: false }, updated_value: default_value, got_updated, was_same: old_value === new_value, is_same: old_value === default_value, default_value, is_fallback: true, available_values: available_mode_values }
    }

    const valid_new_value = new_value as string
    const got_updated = !is_old_valid || (is_old_valid && old_value !== new_value)
    if (got_updated) localStorage.setItem(mode_SK, valid_new_value)
    return { is_handled: true, old: { value: old_value, was_valid: is_old_valid }, new: { value: new_value, was_valid: true }, updated_value: valid_new_value, got_updated, was_same: old_value === valid_new_value, is_same: old_value === valid_new_value, default_value, is_fallback: valid_new_value === default_value, available_values: available_mode_values }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region RESOLVED MODE - sanitizer --------------------------------------------------------------

  // #endregion -------------------------------------------------------------------------------------
  // #region COLOR SCHEME - retriever ---------------------------------------------------------------
  function retrieve_CS() {
    const value = html.style.colorScheme
    return !value ? null : value
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region COLOR SCHEME - sanitizer ---------------------------------------------------------------
  function sanitize_CS({ mode, value }: { mode: Nullable<string>; value: Nullable<string> }): CS_Sanitization {
    if (!config.mode) return { is_handled: false, mode, is_available_mode: undefined, default_mode: undefined, is_fallback_mode: undefined, value, is_valid: undefined, sanitized_value: undefined, available_modes: new Set() }

    const available_modes = available_values.get('mode') as NonNullable<ReturnType<(typeof available_values)['get']>>
    const default_mode = default_values.get('mode') as NonNullable<ReturnType<(typeof default_values)['get']>>
    const default_CS = color_schemes.get(default_mode) as NonNullable<ReturnType<(typeof color_schemes)['get']>>

    if (!mode) return {is_handled: true, mode, is_available_mode: undefined, default_mode, is_fallback_mode: true, value, is_valid: undefined, sanitized_value: default_CS, available_modes}
    if (!available_modes.has(mode)) return {is_handled: true, mode, is_available_mode: false, default_mode, is_fallback_mode: true, value, is_valid: undefined, sanitized_value: default_CS, available_modes}

    const valid_CS = color_schemes.get(mode) as NonNullable<ReturnType<(typeof color_schemes)['get']>>

    if (!value) return {is_handled: true, mode, is_available_mode: true, default_mode, is_fallback_mode: false, value, is_valid: undefined, sanitized_value: valid_CS, available_modes}
    if (valid_CS !== value) return {is_handled: true, mode, is_available_mode: true, default_mode, is_fallback_mode: false, value, is_valid: false, sanitized_value: valid_CS, available_modes}

    return {is_handled: true, mode, is_available_mode: true, default_mode, is_fallback_mode: false, value, is_valid: true, sanitized_value: value, available_modes}
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region COLOR SCHEME - updater -----------------------------------------------------------------
  function update_CS(mode: Nullable<string>) {
    const { is_handled } = sanitize_SM(mode)

    if (!is_handled) {
      // TODO: clean color scheme if present on page
      return { is_handled: false }
    }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region INITIALIZATION -------------------------------------------------------------------------
  function init() {
    const retrieved_values = retrieve_SVs()
    update_SVs(retrieved_values)
    update_TAs(retrieved_values)
    update_SM(retrieved_values.get('mode'))
    // update_CS(retrieved_values.get('mode'))
  }
  // #endregion -------------------------------------------------------------------------------------

  init()
}
