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
      const got_updated = !curr || (!!curr && !curr.is_available) || (!!curr && curr.is_available && curr.value !== value)

      values.set(prop, {
        prop: { prop, is_handled: true, is_provided: !!prov },
        value: {
          current: { value: curr?.value, is_available: curr?.is_available },
          provided: { value: prov?.value, is_available: prov?.is_available, is_default: is_default_value(prop, prov?.value), is_same: (!curr?.value && !prov?.value) || curr?.value === prov?.value },
          updated: { value, is_default: is_default_value(prop, value), is_fallback: !prov || prov.is_fallback, is_same: curr?.value === value, has_changed: got_updated },
          default: curr?.default,
        },
        available_values,
      })
    })

    prov_values.not_handled.forEach((value, prop) => {
      const curr = curr_values.processed.get(prop)?.value
      const prov = prov_values.processed.get(prop)?.value
      const got_deleted = !!curr

      values.set(prop, {
        prop: { prop, is_handled: false, is_provided: !!prov },
        value: {
          current: { value: curr?.value, is_available: curr?.is_available },
          provided: { value: prov?.value, is_available: prov?.is_available, is_default: is_default_value(prop, prov?.value), is_same: (!curr?.value && !prov?.value) || curr?.value === prov?.value },
          updated: { value: undefined, is_default: undefined, is_fallback: undefined, is_same: !curr, has_changed: got_deleted },
          default: undefined,
        },
        available_values: new Set(),
      })
    })

    curr_values.not_handled.forEach((value, prop) => {
      const curr = curr_values.processed.get(prop)?.value
      const prov = prov_values.processed.get(prop)?.value
      const got_deleted = !!prov

      values.set(prop, {
        prop: { prop, is_handled: false, is_provided: !!prov },
        value: {
          current: { value: curr?.value, is_available: curr?.is_available },
          provided: { value: prov?.value, is_available: prov?.is_available, is_default: is_default_value(prop, prov?.value), is_same: (!curr?.value && !prov?.value) || curr?.value === prov?.value },
          updated: { value: undefined, is_default: undefined, is_fallback: undefined, is_same: !curr, has_changed: got_deleted },
          default: undefined,
        },
        available_values: new Set(),
      })
    })

    const performed_update = Array.from(values).some(([prop, info]) => info.value.updated.has_changed)
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
}
