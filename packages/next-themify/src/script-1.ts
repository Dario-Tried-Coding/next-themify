import { Color_Scheme } from './constants'
import { Selector } from './types/index'
import { Custom_SE, RM_Change_Report, RM_Sanitization, Script_Params, SM_Sanitization, Value_Change_Report, Value_Sanitization, Values_Change_Report, Values_Sanitization } from './types/script'
import { Nullable, NullOr, UndefinedOr } from './types/utils'

export function script({ storage_keys: { config_SK, mode_SK }, custom_SEK, config, constants: { STRATS, COLOR_SCHEMES }, transitions: { disable_on_change: disable_transitions_on_change, nonce } }: Script_Params) {
  const html = document.documentElement

  const handled_props = get_handled_props()
  const available_values = get_available_values()
  const preferred_values = get_preferred_values()
  const resolved_modes = get_resolved_modes()

  // #region HELPERS --------------------------------------------------------------------------------
  function json_to_map(input: Nullable<string>) {
    if (!input?.trim()) return new Map<string, string>()
    try {
      const parsed = JSON.parse(input)
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') return new Map<string, string>()
      return new Map(Object.entries(parsed).filter(([key, value]) => typeof key === 'string' && (typeof value === 'string' || value === null)) as [string, NullOr<string>][])
    } catch {
      return new Map<string, string>()
    }
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
  function get_available_values<T extends UndefinedOr<string> = undefined>(target?: T): T extends string ? UndefinedOr<Set<string>> : Map<string, Set<string>> {
    const available_values: Map<string, Set<string>> = new Map()

    // prettier-ignore
    for (const [prop, strat_obj] of Object.entries(config)) {
      let values: string[] = []
      switch (strat_obj.strategy) {
        case STRATS.mono: values = [strat_obj.key]; break
        case STRATS.custom: values = strat_obj.keys.map((i) => i.key); break
        case STRATS.multi: values = strat_obj.keys; break
        case STRATS.light_dark: values = Object.values(strat_obj.keys).flat().map((i) => (typeof i === 'string' ? i : i.key)); break
        default: continue
      }
      available_values.set(prop, new Set(values))
    }

    return target ? available_values.get(target) : (available_values as any)
  }
  function is_available(prop: string, value: Nullable<string>) {
    if (!value) return undefined
    return available_values.get(prop)?.has(value)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - preferred values -----------------------------------------------------------------
  function get_preferred_values() {
    return new Map(Object.entries(config).map(([prop, obj]) => [prop, obj.strategy === STRATS.mono ? obj.key : obj.preferred]))
  }
  function get_preferred_value(prop: string) {
    return preferred_values.get(prop)
  }
  function is_preferred(prop: string, value: NullOr<string>) {
    if (!value) return false
    return preferred_values.get(prop) === value
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - mode ---------------------------------------------------------------------------
  function is_selector_enabled(selector: Selector) {
    return !config.mode?.selector || config.mode.selector === selector || config.mode.selector.includes(selector)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - resolved modes -----------------------------------------------------------------
  function get_resolved_modes() {
    const resolved_modes: Map<string, Color_Scheme> = new Map()
    // prettier-ignore
    switch (config.mode?.strategy) {
      case STRATS.mono: resolved_modes.set(config.mode.key, config.mode.colorScheme); break
      case STRATS.custom: config.mode.keys.forEach(({ key, colorScheme }) => resolved_modes.set(key, colorScheme)); break
      case STRATS.light_dark: Object.entries(config.mode.keys).forEach(([key, i]) => {
          if (typeof i !== 'string') i.forEach(({ key, colorScheme }) => resolved_modes.set(key, colorScheme))
          else if (Object.values(COLOR_SCHEMES).includes(key as Color_Scheme)) resolved_modes.set(i, key as Color_Scheme)
        }); break
      default: break
    }
    return resolved_modes
  }
  function get_resolved_mode(mode: Nullable<string>) {
    const is_mode_handled = is_handled_prop('mode')
    const is_mode_available = is_mode_handled ? is_available('mode', mode) : undefined
    const is_mode_system = is_mode_handled ? config.mode!.strategy === STRATS.light_dark && config.mode!.enableSystem && mode === config.mode!.keys.system : undefined
    const resolved_mode = is_mode_available ? (is_mode_system ? resolve_system_mode() : resolved_modes.get(mode!)) : undefined
    return resolved_mode
  }
  function resolve_system_mode() {
    if (!(config.mode && config.mode.strategy === STRATS.light_dark && config.mode.enableSystem)) return undefined
    const supports_pref = window.matchMedia('(prefers-color-scheme').media !== 'not all'
    const prefers_dark = window.matchMedia('(prefers-color-scheme').matches && window.matchMedia('(prefers-color-scheme: dark').matches
    const resolved_mode = supports_pref ? (prefers_dark ? 'dark' : 'light') : resolved_modes.get(config.mode.fallback)
    return resolved_mode
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region VALUE - sanitizer ----------------------------------------------------------------------
  function sanitize_value({ prop, candidate, candidate_fallback }: { prop: string; candidate: Nullable<string>; candidate_fallback?: Nullable<string> }): Value_Sanitization {
    const is_handled = is_handled_prop(prop)
    const available = (is_handled ? get_available_values(prop) : undefined) ?? new Set()
    const preferred = get_preferred_value(prop)

    const is_candidate_fallback_provided = candidate_fallback !== undefined
    const is_candidate_fallback_available = is_handled && is_candidate_fallback_provided ? is_available(prop, candidate_fallback) : undefined

    const fallback = is_handled ? (is_candidate_fallback_available ? (candidate_fallback as NonNullable<typeof candidate_fallback>) : preferred) : undefined
    const is_fallback_reverted = is_handled && is_candidate_fallback_provided ? !is_candidate_fallback_available : undefined

    const is_candidate_provided = candidate !== undefined
    const is_candidate_available = is_handled && is_candidate_provided ? is_available(prop, candidate) : undefined

    const sanitized = is_handled ? (is_candidate_available ? (candidate as NonNullable<typeof candidate>) : fallback) : undefined
    const is_sanitized_reverted = !is_candidate_available
    const is_sanitized_system = prop === 'mode' && is_handled && config.mode?.strategy === STRATS.light_dark ? config.mode.enableSystem && sanitized === config.mode.keys.system : undefined

    return {
      prop: { prop, is_handled },
      available,
      preferred,
      candidate_fallback: { is_provided: is_candidate_fallback_provided, value: candidate_fallback },
      fallback: { value: fallback, is_reverted: is_fallback_reverted },
      candidate: { is_provided: is_candidate_provided, value: candidate },
      sanitized: { value: sanitized, is_reverted: is_sanitized_reverted, ...(prop === 'mode' ? { is_system: is_sanitized_system } : {}) },
    }
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region VALUES - sanitizer ----------------------------------------------------------------------
  function sanitize_values({ candidate_values, candidate_fallback_values }: { candidate_values: Map<string, NullOr<string>>; candidate_fallback_values?: Map<string, NullOr<string>> }): Values_Sanitization {
    const sanitization: Values_Sanitization['sanitization'] = new Map()

    if (candidate_fallback_values) {
      for (const [prop, candidate_fallback] of candidate_fallback_values?.entries()) {
        sanitization.set(prop, sanitize_value({ prop, candidate: undefined, candidate_fallback }))
      }
    }

    for (const [prop, candidate] of candidate_values.entries()) {
      const candidate_fallback = candidate_fallback_values?.get(prop)
      sanitization.set(prop, sanitize_value({ prop, candidate, candidate_fallback }))
    }

    for (const prop of handled_props) {
      if (!sanitization.has(prop)) sanitization.set(prop, sanitize_value({ prop, candidate: undefined }))
    }

    const are_ready_to_use = [...sanitization.values()].every(({ prop, sanitized }) => prop.is_handled && !sanitized.is_reverted)

    return { performed_on: candidate_values, are_ready_to_use, sanitization }
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region VALUE - updater -------------------------------------------------------------------------
  function update_value({ prop: target_prop, candidate: candidate_value, setter, ...opts }: { prop: string; candidate: Nullable<string>; setter: (prop: string, value: UndefinedOr<string>) => void } & ({ previous: Nullable<string> } | { getter: () => Nullable<string> })): Value_Change_Report {
    const active = 'getter' in opts
    const candidate_fallback_value = active ? opts.getter() : opts.previous

    const { prop, available, preferred, candidate_fallback: previous, candidate, sanitized: current } = sanitize_value({ prop: target_prop, candidate: candidate_value, candidate_fallback: candidate_fallback_value })

    const is_updated = !previous.value !== !current.value || previous.value !== current.value
    const is_reverted = current.is_reverted ?? false
    const did_execute = prop.is_handled ? (active ? is_updated : is_reverted) : false

    if (did_execute) setter(prop.prop, current.value)
    return { prop, available, preferred, previous, candidate, current: { value: current.value, is_updated, is_reverted }, did_execute }
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region VALUES - updater ------------------------------------------------------------------------
  function update_values({ candidate_values, setter, ...opts }: { candidate_values: Map<string, NullOr<string>>; setter: (values: Map<string, UndefinedOr<string>>) => void } & ({ getter: () => Map<string, NullOr<string>> } | { previous_values: Map<string, NullOr<string>> })): Values_Change_Report {
    const active = 'getter' in opts
    const candidate_fallback_values = active ? opts.getter() : opts.previous_values
    const { sanitization } = sanitize_values({ candidate_values, candidate_fallback_values })

    const report: Values_Change_Report['report'] = new Map()
    for (const {
      prop: { prop },
      candidate: { value: candidate },
      candidate_fallback: { value: previous },
    } of sanitization.values()) {
      const setter = () => {}
      report.set(prop, update_value(active ? { prop, candidate, getter: () => candidate_fallback_values.get(prop), setter } : { prop, candidate, previous, setter }))
    }

    const did_update = [...report.values()].some(({ current }) => current.is_updated)
    const did_reverte = [...report.values()].some(({ prop, current }) => prop.is_handled && current.is_reverted)
    const did_execute = active ? did_update : did_reverte

    const current = new Map([...report.entries()].map(([prop, { current }]) => [prop, current.value]))

    if (did_execute) setter(current)
    return { report, current, did_update, did_reverte, did_execute }
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region SVs - retriever -------------------------------------------------------------------------
  function retrieve_SVs() {
    return json_to_map(localStorage.getItem(config_SK))
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region SVs - updater ---------------------------------------------------------------------------
  function update_SVs({ candidate_values, previous_values }: { candidate_values: Map<string, NullOr<string>>; previous_values?: Map<string, NullOr<string>> }) {
    const active = !previous_values
    const getter = retrieve_SVs
    const setter: Parameters<typeof update_values>[0]['setter'] = (values) => {
      const stringified_values = (values: Map<string, NullOr<string>>) => JSON.stringify(Object.fromEntries(values))

      const filtered_entries = new Map(Array.from(values.entries()).filter(([prop, value]) => !!value) as [string, string][])
      localStorage.setItem(config_SK, stringified_values(filtered_entries))

      dispatch_custom_SE({ key: config_SK, newValue: stringified_values(filtered_entries), oldValue: active ? stringified_values(getter()) : stringified_values(candidate_values) })
    }

    const options = { candidate_values, setter, ...(previous_values ? { previous_values } : { getter }) } satisfies Parameters<typeof update_values>[0]
    return update_values(options)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region TA - updater ----------------------------------------------------------------------------
  function update_TA({ prop, candidate_value, previous_value }: { prop: string; candidate_value: NullOr<string>; previous_value?: NullOr<string> }) {
    const setter: Parameters<typeof update_value>[0]['setter'] = (prop, value) => {
      if (value) html.setAttribute(`data-${prop}`, value)
      else html.removeAttribute(`data-${prop}`)
    }

    const options = { prop, candidate: candidate_value, setter, ...(previous_value !== undefined ? { previous: previous_value } : { getter: () => retrieve_TA(prop) }) } satisfies Parameters<typeof update_value>[0]
    return update_value(options)
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region TAs - updater ---------------------------------------------------------------------------
  function update_TAs({ candidate_values, previous_values }: { candidate_values: Map<string, NullOr<string>>; previous_values?: Map<string, NullOr<string>> }) {
    const getter = retrieve_TAs
    const setter: Parameters<typeof update_values>[0]['setter'] = (values) => {
      for (const [prop, value] of values) {
        if (value) html.setAttribute(`data-${prop}`, value)
        else html.removeAttribute(`data-${prop}`)
      }
    }

    const options = { candidate_values, setter, ...(previous_values ? { previous_values } : { getter }) } satisfies Parameters<typeof update_values>[0]
    return update_values(options)
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region SM - updater ----------------------------------------------------------------------------
  function update_SM({ candidate, previous }: { candidate: Nullable<string>; previous?: Nullable<string> }) {
    const active = previous === undefined
    const getter = retrieve_SM
    const setter: Parameters<typeof update_value>[0]['setter'] = (prop, value) => {
      if (value) localStorage.setItem(mode_SK, value)
      else localStorage.removeItem(mode_SK)

      dispatch_custom_SE({ key: mode_SK, newValue: value ?? null, oldValue: active ? getter() : (candidate ?? null) })
    }

    const options = { prop: 'mode', candidate, setter, ...(previous !== undefined ? { previous } : { getter }) } satisfies Parameters<typeof update_value>[0]
    return update_value(options)
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region CS - updater ---------------------------------------------------------------------------
  function update_CS({ mode, candidate, previous }: { mode: NullOr<string>; candidate: Nullable<string>; previous?: Nullable<string> }) {
    const getter = retrieve_CS
    const setter: Parameters<typeof handle_RM_change>[0]['setter'] = (v) => (html.style.colorScheme = v ?? '')

    const opts = { selector: 'color-scheme', mode, candidate, setter, ...(previous !== undefined ? { previous } : { getter }) } satisfies Parameters<typeof handle_RM_change>[0]
    return handle_RM_change(opts)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region MC - updater ---------------------------------------------------------------------------
  function update_MC({ mode, candidate, previous }: { mode: NullOr<string>; candidate: Nullable<string>; previous?: Nullable<string> }) {
    const getter = retrieve_MC
    const setter: Parameters<typeof handle_RM_change>[0]['setter'] = (MC) => {
      if (!MC) {
        html.classList.remove(COLOR_SCHEMES.dark, COLOR_SCHEMES.light)
        return
      }

      html.classList.toggle(COLOR_SCHEMES.dark, MC === COLOR_SCHEMES.dark)
      html.classList.toggle(COLOR_SCHEMES.light, MC === COLOR_SCHEMES.light)
    }

    const opts = { selector: 'class', mode, candidate, setter, ...(previous !== undefined ? { previous } : { getter }) } satisfies Parameters<typeof handle_RM_change>[0]
    return handle_RM_change(opts)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region INITIALIZATION -------------------------------------------------------------------------
  function init() {
    const retrieved_values = retrieve_SVs()
    update_SVs({ candidate_values: retrieved_values })
    update_TAs({ candidate_values: retrieved_values })

    const SM = retrieved_values.get('mode') ?? null
    update_SM({ candidate: SM })

    const RM = get_resolved_mode(SM)
    update_CS({ mode: SM, candidate: RM })
    update_MC({ mode: SM, candidate: RM })
  }
  // #endregion -------------------------------------------------------------------------------------
  init()
}