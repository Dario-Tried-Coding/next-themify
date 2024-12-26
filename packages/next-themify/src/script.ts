import { Color_Scheme } from './constants'
import { Static_Mode_Prop } from './types/index'
import { Script_Params } from './types/script'
import { Nullable, UndefinedOr } from './types/utils'

export function script({ config, constants: { STRATS, COLOR_SCHEMES }, keys: { config_SK, mode_SK, custom_SEK } }: Script_Params) {
  const html = document.documentElement

  const handled_props = get_handled_props()
  const eventual_mode_prop = get_eventual_mode_prop()
  const available_values = get_available_values()
  const resolved_modes = get_resolved_modes()

  // #region HELPERS -------------------------------------------------------------------------------------------
  function json_to_obj(input: Nullable<string>) {
    if (!input?.trim()) return {} as Record<string, string>
    try {
      const parsed = JSON.parse(input)
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') return {}
      return Object.entries(parsed).reduce(
        (acc, [key, value]) => {
          if (typeof key === 'string' && typeof value === 'string') acc[key] = value
          return acc
        },
        {} as Record<string, string>
      )
    } catch {
      return {}
    }
  }
  // #endregion ------------------------------------------------------------------------------------------------
  // #region UTILS ---------------------------------------------------------------------------------------------
  function get_handled_props() {
    return Object.keys(config)
  }
  function is_handled_prop(prop: string) {
    return Object.keys(config).includes(prop)
  }
  function get_eventual_mode_prop() {
    return Object.entries(config).find(([prop, strat_obj]) => strat_obj.type === 'mode') as UndefinedOr<[string, Static_Mode_Prop]>
  }
  function get_available_values() {
    const values: Record<string, string[]> = {}

    // prettier-ignore
    for (const [prop, strat_obj] of Object.entries(config)) {
      let prop_values: string[] = []
      switch (strat_obj.strategy) {
        case STRATS.mono: prop_values = [strat_obj.key]; break
        case STRATS.multi: prop_values = strat_obj.keys.map((k) => (typeof k === 'string' ? k : k.key)); break
        case STRATS.light_dark: prop_values = Object.values(strat_obj.keys).flat().map(k => (typeof k === 'string' ? k : k.key)); break
      }
      values[prop] = prop_values
    }

    return values
  }
  function get_prop_available_values(prop: string) {
    return available_values[prop]
  }
  function get_prop_pref_value(prop: string) {
    return config[prop] ? (config[prop]?.strategy === STRATS.mono ? config[prop].key : config[prop].preferred) : undefined
  }
  function get_resolved_modes() {
    const resolved_modes: Record<string, Color_Scheme> = {}
    if (!eventual_mode_prop) return resolved_modes

    const strat_obj = eventual_mode_prop[1]
    if (strat_obj.strategy === STRATS.mono) resolved_modes[eventual_mode_prop[0]] = strat_obj.colorScheme
    else if (strat_obj.strategy === STRATS.multi) strat_obj.keys.forEach((k) => (resolved_modes[k.key] = k.colorScheme))
    else if (strat_obj.strategy === STRATS.light_dark) {
      const keys = strat_obj.keys

      resolved_modes[keys.light] = 'light'
      resolved_modes[keys.dark] = 'dark'
      keys.custom?.forEach((k) => (resolved_modes[k.key] = k.colorScheme))

      const fallback_resolved_mode = resolved_modes[strat_obj.fallback] === COLOR_SCHEMES.light ? 'light' : 'dark'

      const is_system_disabled = strat_obj.enableSystem === false
      if (!is_system_disabled) resolved_modes[keys.system] = fallback_resolved_mode

      const is_system_pref_supported = window.matchMedia('(prefers-color-scheme)').media !== 'not all'
      if (!is_system_pref_supported) resolved_modes[keys.system] = fallback_resolved_mode

      resolved_modes[keys.system] = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    return resolved_modes
  }
  // #endregion ------------------------------------------------------------------------------------------------
  // #region VALUES --------------------------------------------------------------------------------------------
  function retrieve_values() {
    const retrieved_string = localStorage.getItem(config_SK)
    return json_to_obj(retrieved_string)
  }
  function sanitize_value({ prop, candidate }: { prop: string; candidate: string }) {
    const is_handled = is_handled_prop(prop)
    const available = get_prop_available_values(prop)
    const preferred = get_prop_pref_value(prop)

    const fallback = preferred

    const is_candidate_provided = candidate !== undefined
    const is_candidate_available = is_handled && is_candidate_provided ? available?.includes(candidate as string) : false

    const sanitized = is_handled ? (is_candidate_available ? candidate : fallback) : undefined
    return sanitized
  }
  function sanitize_values(values: Record<string, string>) {
    const sanitized_values: Record<string, string> = {}
    for (const [prop, candidate] of Object.entries(values)) {
      const sanitized = sanitize_value({ prop, candidate })
      if (sanitized) sanitized_values[prop] = sanitized
    }
    for (const prop of handled_props) {
      if (!sanitized_values[prop]) sanitized_values[prop] = get_prop_pref_value(prop) as string
    }
    return sanitized_values
  }
  function store_values(values: Record<string, string>) {
    localStorage.setItem(config_SK, JSON.stringify(values))
  }
  // #endregion ------------------------------------------------------------------------------------------------
  // #region THEME ATTRIBUTES ----------------------------------------------------------------------------------
  function set_theme_attributes(values: Record<string, string>) {
    for (const [prop, value] of Object.entries(values)) {
      html.setAttribute(prop, value)
    }
  }
  // #endregion ------------------------------------------------------------------------------------------------
  // #region STORAGE MODE --------------------------------------------------------------------------------------
  function store_mode(value: string) {
    localStorage.setItem(mode_SK, value)
  }
  // #endregion ------------------------------------------------------------------------------------------------
  // #region COLOR SCHEME --------------------------------------------------------------------------------------
  function set_color_scheme(color_scheme: Color_Scheme) {
    html.setAttribute('colorScheme', color_scheme)
  }
  // #endregion ------------------------------------------------------------------------------------------------
  // #region MODE CLASS ----------------------------------------------------------------------------------------
  function set_mode_class(color_scheme: Color_Scheme) {
    html.classList.remove('light', 'dark')
    html.classList.add(color_scheme)
  }
  // #endregion ------------------------------------------------------------------------------------------------
  // #region INIT ----------------------------------------------------------------------------------------------
  function init() {
    const retrieved_values = retrieve_values()
    const sanitized_values = sanitize_values(retrieved_values)
    store_values(sanitized_values)
    set_theme_attributes(sanitized_values)

    const sanitized_mode_value = Object.entries(sanitized_values).find(([prop, value]) => eventual_mode_prop && prop === eventual_mode_prop[0])?.[1]
    if (sanitized_mode_value) {
      const [prop, strat_obj] = eventual_mode_prop as [string, Static_Mode_Prop]
      if (strat_obj.store) store_mode(sanitized_mode_value)

      const resolved_mode = resolved_modes[prop]
      if (resolved_mode) {
        const selector = strat_obj.selector
        if (!selector || selector === 'colorScheme' || selector.includes('colorScheme')) set_color_scheme(resolved_mode)
        if (!selector || selector === 'class' || selector.includes('class')) set_mode_class(resolved_mode)
      }
    }
  }
  // #endregion ------------------------------------------------------------------------------------------------

  init()
}
