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
  function sanitize_HVs(values: Map<string, string>, opts?: { fallback_values?: Map<string, string> }): HVs_Sanitization {
    const processed: HVs_Sanitization['values']['processed'] = new Map()

    for (const [prop, value] of values) {
      if (!is_handled_prop(prop)) {
        processed.set(prop, { prop: { prop, is_handled: false }, value: { value, is_available: undefined, default: undefined, sanitized: undefined, is_default: undefined, is_fallback: undefined }, available_values: new Set() })
        continue
      }

      const available_values = get_prop_available_values(prop) as NonNullable<ReturnType<typeof get_prop_available_values>>
      const default_value = get_prop_default_value(prop) as NonNullable<ReturnType<typeof get_prop_default_value>>
      const fallback = opts?.fallback_values?.get(prop) ?? default_value

      if (!is_available_value(prop, value)) {
        processed.set(prop, { prop: { prop, is_handled: true }, value: { value, is_available: false, default: default_value, sanitized: fallback, is_fallback: true, is_default: is_default_value(prop, fallback) }, available_values })
        continue
      }

      processed.set(prop, { prop: { prop, is_handled: true }, value: { value, is_available: true, default: default_value, sanitized: value, is_fallback: false, is_default: is_default_value(prop, value) }, available_values })
    }

    const missing = new Map(
      Array.from(default_values)
        .filter(([prop]) => !values.has(prop))
        .map(([prop]) => [prop, opts?.fallback_values?.get(prop) ?? default_values.get(prop)] as [typeof prop, NonNullable<ReturnType<(typeof default_values)['get']>>])
    )
    const handled = new Map([
      ...Array.from(processed)
        .filter(([prop, info]) => info.prop.is_handled)
        .map(([prop, info]) => [prop, info.value.sanitized] as [string, NonNullable<typeof info.value.sanitized>]),
      ...missing,
    ])
    const not_handled = new Map(
      Array.from(processed)
        .filter(([prop, info]) => !info.prop.is_handled)
        .map(([prop, info]) => [prop, info.value.value])
    )

    const are_proper_values = missing.size === 0 && Array.from(processed.values()).every((i) => i.prop.is_handled && i.value.is_available)
    return { performed_on: values, values: { processed, missing, handled, not_handled }, are_proper_values, ctx: { handled_props, available_values, default_values } }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region HV - update ----------------------------------------------------------------------------
  function update_HVs({ provided_values, current_values, setter }: { provided_values: Map<string, string>; current_values: Map<string, string>; setter: (Handled_Values: Map<string, string>) => void }): HVs_Update {
    const { values: curr_values } = sanitize_HVs(current_values)
    const { values: prov_values, ctx } = sanitize_HVs(provided_values, { fallback_values: curr_values.handled })

    const values: HVs_Update['values'] = new Map()
    prov_values.handled.forEach((value, prop) => {
      const curr = curr_values.processed.get(prop)?.value
      const prov = prov_values.processed.get(prop)?.value

      const available_values = prov_values.processed.get(prop)?.available_values as NonNullable<ReturnType<(typeof prov_values)['processed']['get']>>['available_values']

      values.set(prop, {
        prop: { prop, is_handled: true, is_provided: !!prov },
        value: {
          current: { value: curr?.value, is_available: curr?.is_available },
          provided: { value: prov?.value, is_available: prov?.is_available, is_default: is_default_value(prop, prov?.value), is_same: (!curr?.value && !prov?.value) || curr?.value === prov?.value },
          updated: { value, is_default: is_default_value(prop, value), is_fallback: !prov || prov.is_fallback, is_same: curr?.value === value },
          default: curr?.default,
        },
        available_values,
      })
    })

    const not_handled_values: Map<string, string> = new Map([...Array.from(prov_values.not_handled), ...Array.from(curr_values.not_handled)])
    not_handled_values.forEach((value, prop) => {
      const curr = curr_values.processed.get(prop)?.value
      const prov = prov_values.processed.get(prop)?.value

      values.set(prop, {
        prop: { prop, is_handled: false, is_provided: !!prov },
        value: {
          current: { value: curr?.value, is_available: curr?.is_available },
          provided: { value: prov?.value, is_available: prov?.is_available, is_default: is_default_value(prop, prov?.value), is_same: (!curr?.value && !prov?.value) || curr?.value === prov?.value },
          updated: { value: undefined, is_default: undefined, is_fallback: undefined, is_same: !curr },
          default: undefined,
        },
        available_values: new Set(),
      })
    })

    const performed_update = Array.from(values).some(([prop, info]) => !info.value.updated.is_same)
    if (performed_update) setter(prov_values.handled)
    return { performed_update, values, ctx }
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
  function sanitize_SM(provided_value: Nullable<string>, opts?: { fallback_value?: string }): SM_Sanitization {
    if (!config.mode) return { is_handled: false, value: provided_value, is_available: undefined, sanitized_mode: undefined, is_fallback: undefined, is_default: undefined, is_system: undefined, available_modes: new Set(), default_mode: undefined }

    const available_modes = available_values.get('mode') as NonNullable<ReturnType<typeof get_prop_available_values>>
    const default_mode = get_prop_default_value('mode') as NonNullable<ReturnType<typeof get_prop_default_value>>
    const fallback_mode = opts?.fallback_value ?? default_mode
    const is_system = (mode: string) => config.mode?.strategy === STRATS.light_dark && config.mode.enableSystem && mode === config.mode.keys.system

    if (!provided_value) return { is_handled: true, value: provided_value, is_available: undefined, sanitized_mode: fallback_mode, is_fallback: true, is_default: is_default_value('mode', fallback_mode), is_system: is_system(fallback_mode), available_modes, default_mode }
    if (!available_modes.has(provided_value)) return { is_handled: true, value: provided_value, is_available: false, sanitized_mode: fallback_mode, is_fallback: true, is_default: is_default_value('mode', fallback_mode), is_system: is_system(fallback_mode), available_modes, default_mode }
    return { is_handled: true, value: provided_value, is_available: true, sanitized_mode: provided_value, is_fallback: false, is_default: is_default_value('mode', provided_value), is_system: is_system(provided_value), available_modes, default_mode }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SM - update ----------------------------------------------------------------------------
  function update_SM(provided_value: Nullable<string>): SM_Update {
    const curr = sanitize_SM(retrieve_SM())
    const prov = sanitize_SM(provided_value, { fallback_value: curr.sanitized_mode })

    if (!curr.is_handled || !prov.is_handled) {
      const must_delete = !!curr.value
      if (must_delete) localStorage.removeItem(mode_SK)
      return {
        is_handled: false,
        current: { value: curr.value, is_available: curr.is_available },
        provided: { value: prov.value, is_available: prov.is_available, is_same: (!curr.value && !prov.value) || curr.value === prov.value, is_default: is_default_value('mode', prov.value) },
        updated: { mode: undefined, is_default: undefined, is_fallback: undefined, is_same: !must_delete },
        available_modes: curr.available_modes,
        default_mode: curr.default_mode,
        performed_update: must_delete,
      }
    }

    const must_update = curr.value !== prov.sanitized_mode
    if (must_update) localStorage.setItem(mode_SK, prov.sanitized_mode as NonNullable<typeof prov.sanitized_mode>)
    return {
      is_handled: true,
      current: { value: curr.value, is_available: curr.is_available },
      provided: { value: prov.value, is_available: prov.is_available, is_same: (!curr.value && !prov.value) || curr.value === prov.value, is_default: is_default_value('mode', prov.value) },
      updated: { mode: prov.sanitized_mode, is_default: prov.is_default, is_fallback: prov.is_fallback, is_same: !must_update },
      available_modes: curr.available_modes,
      default_mode: curr.default_mode,
      performed_update: must_update,
    }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - resolve ---------------------------------------------------------------------------
  function resolve_CS(): UndefinedOr<Color_Scheme> {
    if (!(config.mode && config.mode.strategy === STRATS.light_dark && config.mode.enableSystem)) return undefined
    const supports_CSPref = window.matchMedia('(prefers-color-scheme').media !== 'not all'
    const resolved_CS = supports_CSPref ? (window.matchMedia('(prefers-color-scheme').matches && window.matchMedia('(prefers-color-scheme: dark').matches ? 'dark' : 'light') : (color_schemes.get(config.mode.fallback) as NonNullable<ReturnType<(typeof color_schemes)['get']>>)
    return resolved_CS
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - getter ----------------------------------------------------------------------------
  function get_CS({ mode, is_system }: { mode: string; is_system: boolean }) {
    if (!config.mode) return undefined
    return is_system ? (resolve_CS() as NonNullable<ReturnType<typeof resolve_CS>>) : (color_schemes.get(mode) as NonNullable<ReturnType<(typeof color_schemes)['get']>>)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - retrieve --------------------------------------------------------------------------
  function retrieve_CS() {
    const value = html.style.colorScheme
    return !value ? null : value
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - sanitize --------------------------------------------------------------------------
  function sanitize_CS({ mode, value }: { mode: Nullable<string>; value: Nullable<string> }, opts?: { fallback_mode?: string }): CS_Sanitization {
    const { is_handled: is_mode_handled, ...SM_sanitization } = sanitize_SM(mode, { fallback_value: opts?.fallback_mode })

    if (!is_mode_handled) return { is_mode_handled: false, mode: SM_sanitization, CS: { value, correct_CS: undefined, is_correct: undefined, is_resolved: undefined } }

    const correct_CS = get_CS({
      mode: SM_sanitization.sanitized_mode as NonNullable<typeof SM_sanitization.sanitized_mode>,
      is_system: SM_sanitization.is_system as NonNullable<typeof SM_sanitization.is_system>,
    })

    if (!value) return { is_mode_handled: true, mode: SM_sanitization, CS: { value, correct_CS, is_correct: undefined, is_resolved: SM_sanitization.is_system } }

    const is_correct = value === correct_CS
    return { is_mode_handled: true, mode: SM_sanitization, CS: { value, correct_CS, is_correct, is_resolved: SM_sanitization.is_system } }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - update ----------------------------------------------------------------------------
  function update_CS(prov_mode: Nullable<string>): CS_Update {
    const { mode, CS: curr_CS, is_mode_handled } = sanitize_CS({ mode: prov_mode, value: retrieve_CS() })

    if (!is_mode_handled) {
      const must_delete = !!curr_CS.value
      if (must_delete) html.style.removeProperty('color-scheme')
      return { is_mode_handled: false, mode, current: { value: curr_CS.value, is_correct: curr_CS.is_correct, is_resolved: curr_CS.is_resolved }, updated: { CS: undefined, is_same: !must_delete, is_resolved: undefined }, correct_CS: undefined, performed_update: must_delete }
    }

    const correct_CS = get_CS({
      mode: mode.sanitized_mode as NonNullable<typeof mode.sanitized_mode>,
      is_system: mode.is_system as NonNullable<typeof mode.is_system>,
    }) as NonNullable<ReturnType<typeof get_CS>>

    const must_update = curr_CS.value !== correct_CS
    if (must_update) html.style.colorScheme = correct_CS
    return { is_mode_handled: true, mode, current: curr_CS, updated: { CS: correct_CS, is_same: !must_update, is_resolved: mode.is_system }, correct_CS, performed_update: must_update }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region MC - toggle ----------------------------------------------------------------------------
  function toggle_MC(prov_mode: Nullable<string>) {
    const { is_handled, sanitized_mode, is_system } = sanitize_SM(prov_mode)
    if (!is_handled) return

    const CS = get_CS({ mode: sanitized_mode as NonNullable<typeof sanitized_mode>, is_system: is_system as NonNullable<typeof is_system> }) as NonNullable<ReturnType<typeof get_CS>>
    Object.values(COLOR_SCHEMES).forEach(i => html.classList.toggle(i, i === CS))
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region INITIALIZATION -------------------------------------------------------------------------
  function init() {
    const retrieved_SVs = retrieve_SVs()
    update_SVs(retrieved_SVs)
    update_TAs(retrieved_SVs)

    update_SM(retrieved_SVs.get('mode'))
    update_CS(retrieved_SVs.get('mode'))
    toggle_MC(retrieved_SVs.get('mode'))
  }
  // #endregion -------------------------------------------------------------------------------------

  init()
}
