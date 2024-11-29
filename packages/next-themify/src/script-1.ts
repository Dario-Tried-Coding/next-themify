import { Color_Scheme } from './constants'
import { CS_Sanitization, CS_Update, HVs_Sanitization, HVs_Update, Script_Params, SM_Sanitization, SM_Update } from './types/script'
import { Nullable, UndefinedOr } from './types/utils'

export function script({ config_SK, mode_SK, config, constants: { STRATS, MODES, COLOR_SCHEMES } }: Script_Params) {
  const html = document.documentElement

  const handled_props = get_handled_props()
  const available_values = get_available_values()
  const default_values = get_default_values()
  const color_schemes = get_color_schemes()

  // #region HELPERS --------------------------------------------------------------------------------
  function parse_JsonToMappedValues(string: Nullable<string>) {
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
      if (strat_obj.strategy === STRATS.mono) available_values.set(prop, new Set([strat_obj.key]))
      else if (strat_obj.strategy === STRATS.custom) available_values.set(prop, new Set(strat_obj.keys.map((i) => i.key)))
      else if (strat_obj.strategy === STRATS.multi) available_values.set(prop, new Set(strat_obj.keys))
      else if (strat_obj.strategy === STRATS.light_dark)
        available_values.set(
          prop,
          new Set(
            Object.values(strat_obj.keys)
              .flat()
              .map((i) => (typeof i === 'string' ? i : i.key))
          )
        )
    }
    return available_values
  }
  function get_prop_available_values(prop: string) {
    return available_values.get(prop)
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
  function get_prop_default_value(prop: string) {
    return default_values.get(prop)
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
        else if (Object.values(COLOR_SCHEMES).includes(key as Color_Scheme)) color_schemes.set(i, key as Color_Scheme)
      })
    }
    return color_schemes
  }
  function get_color_scheme(mode: string) {
    if (!config.mode) return undefined
    return color_schemes.get(mode)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region HV - sanitize --------------------------------------------------------------------------
  function sanitize_HVs(prov_values: Map<string, string>): HVs_Sanitization {
    const values: HVs_Sanitization['values'] = new Map()

    for (const [prop, value] of prov_values) {
      if (!is_handled_prop(prop)) {
        values.set(prop, { prop, is_handled_prop: false, value, is_available_value: undefined, default_value: undefined, sanitized_value: undefined, is_default_value: undefined, is_fallback_value: undefined, available_values: new Set() })
        continue
      }

      const available_values = get_prop_available_values(prop) as NonNullable<ReturnType<typeof get_prop_available_values>>
      const default_value = get_prop_default_value(prop) as NonNullable<ReturnType<typeof get_prop_default_value>>
      if (!is_available_value(prop, value)) {
        values.set(prop, { prop, is_handled_prop: true, value, is_available_value: false, sanitized_value: default_value, default_value, is_default_value: true, is_fallback_value: true, available_values })
        continue
      }

      values.set(prop, { prop, is_handled_prop: true, value, is_available_value: true, sanitized_value: value, default_value, is_default_value: is_default_value(prop, value), is_fallback_value: false, available_values })
    }

    const missing_values = new Map(Array.from(default_values.entries()).filter(([prop]) => !values.has(prop)))
    const are_proper_values = missing_values.size === 0 && Array.from(values.values()).every((i) => i.is_handled_prop && i.is_available_value)
    return { performed_on: prov_values, values, are_proper_values, missing_values, ctx: { handled_props, available_values, default_values } }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region HV - update ----------------------------------------------------------------------------
  function update_HVs({ provided_values, current_values, setter }: { provided_values: Map<string, string>; current_values: Map<string, string>; setter: (Handled_Values: Map<string, string>) => void }): HVs_Update {
    const { values: curr_values } = sanitize_HVs(current_values)
    const { values: prov_values, missing_values } = sanitize_HVs(provided_values)

    const values: HVs_Update['values'] = new Map()
    prov_values.forEach(({ prop, is_handled_prop, value: prov_value, is_available_value: was_prov_available, default_value, available_values }) => {
      const curr_value = curr_values.get(prop)?.value
      const was_curr_available = curr_values.get(prop)?.is_available_value

      if (!is_handled_prop) {
        const got_updated = !!curr_value
        values.set(prop, {
          prop,
          was_provided: true,
          is_handled: false,
          current: { value: curr_value, was_available: was_curr_available },
          provided: { value: prov_value, was_available: was_prov_available, was_same: curr_value === prov_value },
          updated: { value: undefined, is_default: undefined, is_fallback: undefined, got_updated },
          default_value: undefined,
          available_values: new Set(),
        })
        return
      }

      if (!was_prov_available) {
        const got_updated = !curr_value || (!!curr_value && !was_curr_available) || (!!curr_value && was_curr_available && curr_value !== default_value)
        values.set(prop, {
          prop,
          was_provided: true,
          is_handled: true,
          current: { value: curr_value, was_available: was_curr_available },
          provided: { value: prov_value, was_available: was_prov_available, was_same: curr_value === prov_value },
          updated: { value: default_value, is_default: true, is_fallback: true, got_updated },
          default_value,
          available_values,
        })
        return
      }

      const got_updated = !curr_value || (!!curr_value && !was_curr_available) || (!!curr_value && was_curr_available && curr_value !== prov_value)
      values.set(prop, {
        prop,
        was_provided: true,
        is_handled: true,
        current: { value: curr_value, was_available: was_curr_available },
        provided: { value: prov_value, was_available: was_prov_available, was_same: curr_value === prov_value },
        updated: { value: prov_value, is_default: is_default_value(prop, prov_value), is_fallback: false, got_updated },
        default_value,
        available_values,
      })
    })

    Array.from(missing_values.entries()).forEach(([prop, default_value]) => {
      const curr_value = curr_values.get(prop)?.value
      const was_curr_available = curr_values.get(prop)?.is_available_value

      const got_updated = !curr_value || (!!curr_value && !was_curr_available) || (!!curr_value && was_curr_available && curr_value !== default_value)
      values.set(prop, {
        prop,
        was_provided: false,
        is_handled: true,
        current: { value: curr_value, was_available: was_curr_available },
        provided: { value: undefined, was_available: undefined, was_same: !curr_value },
        updated: { value: default_value, is_default: true, is_fallback: true, got_updated },
        default_value,
        available_values: get_prop_available_values(prop) as NonNullable<ReturnType<typeof get_prop_available_values>>,
      })
    })

    const performed_update = Array.from(values.values()).some(({ updated: { got_updated } }) => got_updated)
    const handled_values = new Map(
      Array.from(values.entries())
        .filter(([prop, { is_handled }]) => is_handled)
        .map(
          ([
            prop,
            {
              updated: { value },
            },
          ]) => [prop, value as NonNullable<typeof value>]
        )
    )
    if (performed_update) setter(handled_values)
    return { ctx: { handled_props, available_values, default_values }, values, performed_update }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SV - retrieve --------------------------------------------------------------------------
  function retrieve_SVs() {
    const storage_string = localStorage.getItem(config_SK)
    return parse_JsonToMappedValues(storage_string)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SV - update ----------------------------------------------------------------------------
  function update_SVs(provided_values: Map<string, string>) {
    const current_values = retrieve_SVs()
    const setter: Parameters<typeof update_HVs>[0]['setter'] = (handled_values) => localStorage.setItem(config_SK, JSON.stringify(Object.fromEntries(handled_values)))
    return update_HVs({ provided_values, current_values, setter })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region TA - retrieve --------------------------------------------------------------------------
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
  // #region TA - update ----------------------------------------------------------------------------
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
  // #region SM - retrieve --------------------------------------------------------------------------
  function retrieve_SM() {
    return localStorage.getItem(mode_SK)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SM - sanitize --------------------------------------------------------------------------
  function sanitize_SM(value: Nullable<string>): SM_Sanitization {
    if (!config.mode) return { is_mode_handled: false, available_modes: new Set(), default_mode: undefined, value, is_available: undefined, is_default: undefined, is_fallback: undefined, is_system: undefined, sanitized_mode: undefined }

    const available_modes = available_values.get('mode') as NonNullable<ReturnType<typeof get_prop_available_values>>
    const default_mode = default_values.get('mode') as NonNullable<ReturnType<typeof get_prop_default_value>>

    if (!value) return { is_mode_handled: true, available_modes, default_mode, value, is_available: undefined, is_default: undefined, is_fallback: true, is_system: undefined, sanitized_mode: default_mode }
    if (!available_modes.has(value)) return { is_mode_handled: true, available_modes, default_mode, value, is_available: false, is_default: false, is_fallback: true, is_system: false, sanitized_mode: default_mode }

    const is_system = config.mode.strategy === STRATS.light_dark && config.mode.enableSystem && value === config.mode.keys.system
    return { is_mode_handled: true, available_modes, default_mode, value, is_available: true, is_default: is_default_value('mode', value), is_fallback: false, is_system, sanitized_mode: value }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SM - update ----------------------------------------------------------------------------
  function update_SM(prov_value: Nullable<string>): SM_Update {
    const { value: curr_value, is_available: is_curr_available, default_mode, available_modes } = sanitize_SM(retrieve_SM())

    if (!prov_value) {
      const got_updated = !!curr_value
      if (got_updated) localStorage.removeItem(mode_SK)
      return {
        is_mode_handled: false,
        curr_mode: { value: curr_value, was_available: is_curr_available },
        prov_mode: { value: prov_value, was_available: true, was_same: !curr_value },
        updated_mode: { value: undefined, got_updated, is_default: undefined, is_fallback: undefined },
        available_modes: new Set(),
        default_mode: undefined,
      }
    }

    if (!is_curr_available) {
      const got_updated = !curr_value || (!!curr_value && !is_curr_available) || (!!curr_value && is_curr_available && curr_value !== default_mode)
      if (got_updated) localStorage.setItem(mode_SK, default_mode as NonNullable<typeof default_mode>)
      return {
        is_mode_handled: true,
        curr_mode: { value: curr_value, was_available: is_curr_available },
        prov_mode: { value: prov_value, was_available: true, was_same: curr_value === prov_value },
        updated_mode: { value: default_mode, got_updated, is_default: true, is_fallback: true },
        available_modes,
        default_mode,
      }
    }

    const got_updated = !curr_value || (!!curr_value && !is_curr_available) || (!!curr_value && is_curr_available && curr_value !== prov_value)
    if (got_updated) localStorage.setItem(mode_SK, prov_value)
    return {
      is_mode_handled: true,
      curr_mode: { value: curr_value, was_available: is_curr_available },
      prov_mode: { value: prov_value, was_available: true, was_same: curr_value === prov_value },
      updated_mode: { value: prov_value, got_updated, is_default: is_default_value('mode', prov_value), is_fallback: false },
      available_modes,
      default_mode,
    }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - resolve ---------------------------------------------------------------------------
  function resolve_CS(): Color_Scheme {
    // TODO: implement fallback if system pref not supported
    return window.matchMedia('(prefers-color-scheme').matches && window.matchMedia('(prefers-color-scheme: dark').matches ? 'dark' : 'light'
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - retrieve --------------------------------------------------------------------------
  function retrieve_CS() {
    const value = html.style.colorScheme
    return !value ? null : value
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - sanitize --------------------------------------------------------------------------
  function sanitize_CS({ mode, value }: { mode: Nullable<string>; value: Nullable<string> }): CS_Sanitization {
    const { is_mode_handled, available_modes, default_mode, is_system } = sanitize_SM(mode)

    if (!is_mode_handled) return { is_mode_handled: false, mode: { value: mode, is_available: undefined, sanitized_mode: undefined, is_default: undefined, is_fallback: undefined, is_system: undefined, available_modes: new Set(), default_mode: undefined }, value, correct_CS: undefined, is_correct: undefined }
    if (!mode) return { is_mode_handled: true, mode: { value: mode, is_available: undefined, sanitized_mode: default_mode, is_default: true, is_fallback: true, is_system: undefined, available_modes, default_mode }, value, correct_CS: undefined, is_correct: undefined }

    const correct_CS = is_system ? resolve_CS() : (get_color_scheme(mode) as NonNullable<ReturnType<typeof get_color_scheme>>)
    return { is_mode_handled: true, mode: { value: mode, is_available: true, sanitized_mode: mode, is_default: is_default_value('mode', mode), is_fallback: false, is_system, available_modes, default_mode }, value, correct_CS, is_correct: value === correct_CS }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - update ----------------------------------------------------------------------------
  function update_CS(mode: Nullable<string>): CS_Update {
    const {
      is_mode_handled,
      value: curr_CS,
      correct_CS,
      is_correct,
      mode: { value, is_available, is_system },
    } = sanitize_CS({ mode, value: retrieve_CS() })

    let got_updated: boolean = false
    if (!is_mode_handled) {
      if (!!curr_CS) {
        got_updated = true
        html.style.colorScheme = ''
      }
    } else if (!curr_CS || (!!curr_CS && !is_correct)) {
      got_updated = true
      html.style.colorScheme = correct_CS as NonNullable<typeof correct_CS>
    }

    return {
      is_mode_handled,
      mode: { value, is_available },
      curr_CS: { value: curr_CS, was_correct: is_correct },
      correct_CS,
      updated_CS: { value: correct_CS, got_updated, is_resolved: is_system },
    }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region INITIALIZATION -------------------------------------------------------------------------
  function handle_values(provided_values: Map<string, string>) {
    const updated_SVs = update_SVs(provided_values)
    const updated_TAs = update_TAs(provided_values)

    return { updated_SVs, updated_TAs }
  }
  function handle_mode(mode: UndefinedOr<string>) {
    update_SM(mode)
    console.log(update_CS(mode))
    // const updated_MC = update_MC(mode)
  }
  function init() {
    const retrieved_values = retrieve_SVs()
    handle_values(retrieved_values)
    handle_mode(retrieved_values.get('mode'))
  }
  // #endregion -------------------------------------------------------------------------------------

  init()
}
