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
  // #region ANIMATIONS - disabler ------------------------------------------------------------------
  function disable_animations(nonce?: string) {
    if (!disable_transitions_on_change) return

    const css = document.createElement('style')
    if (nonce) css.setAttribute('nonce', nonce)
    css.appendChild(document.createTextNode(`*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`))
    document.head.appendChild(css)

    return () => {
      ;(() => window.getComputedStyle(document.body))()

      setTimeout(() => {
        document.head.removeChild(css)
      }, 1)
    }
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

    if (did_execute) {
      const enable_animations_back = disable_animations(nonce)
      setter(prop.prop, current.value)
      enable_animations_back?.()
    }
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

    if (did_execute) {
      const enable_animations_back = disable_animations(nonce)
      setter(current)
      enable_animations_back?.()
    }

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
  // #region SVs - change handler -------------------------------------------------------------------
  function handle_SVs_change({ candidate_values, previous_values }: { candidate_values: Map<string, NullOr<string>>; previous_values: Map<string, NullOr<string>> }) {
    const { did_execute } = update_SVs({ candidate_values, previous_values })
    if (did_execute) return

    update_TAs({ candidate_values })
    update_SM({ candidate: candidate_values.get('mode') })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region TA - retriever -------------------------------------------------------------------------
  function retrieve_TA(prop: string) {
    return html.getAttribute(`data-${prop}`)
  }
  // #endregion --------------------------------------------------------------------------------------
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
  // #region TA - change handler ---------------------------------------------------------------------
  function handle_TA_change({ prop, candidate_value, previous_value }: { prop: string; candidate_value: NullOr<string>; previous_value: NullOr<string> }) {
    const { did_execute } = update_TA({ prop, candidate_value, previous_value })
    if (did_execute) return

    update_SVs({ candidate_values: new Map([[prop, candidate_value]]) })
  }
  // endregion ---------------------------------------------------------------------------------------
  // #region TA - mutation handler -------------------------------------------------------------------
  function handle_TA_mutation({ attributeName, oldValue: previous_value }: MutationRecord) {
    if (!Array.from(handled_props).some((p) => attributeName === `data-${p}`)) return

    const prop = attributeName?.replace('data-', '') as string
    const candidate_value = html.getAttribute(attributeName as NonNullable<typeof attributeName>)
    handle_TA_change({ prop, candidate_value, previous_value })
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region TAs - retriever -------------------------------------------------------------------------
  function retrieve_TAs() {
    const retrieved_TAs: Map<string, string> = new Map()

    handled_props.forEach((prop) => {
      const value = retrieve_TA(prop)
      if (value) retrieved_TAs.set(prop, value)
    })

    return retrieved_TAs
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
  // #region SM - retriever --------------------------------------------------------------------------
  function retrieve_SM() {
    return localStorage.getItem(mode_SK)
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region SM - sanitizer --------------------------------------------------------------------------
  function sanitize_SM({ candidate, candidate_fallback }: { candidate: Nullable<string>; candidate_fallback?: Nullable<string> }): SM_Sanitization {
    // prettier-ignore
    const { prop: { is_handled }, ...sanitization } = sanitize_value({ prop: 'mode', candidate, candidate_fallback })
    return { is_handled, ...sanitization }
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
  // #region SM - change handler ---------------------------------------------------------------------
  function handle_SM_change({ candidate, previous }: { candidate: NullOr<string>; previous: NullOr<string> }) {
    const { did_execute } = update_SM({ candidate, previous })
    if (did_execute) return

    const candidate_RM = get_resolved_mode(candidate)
    update_CS({ mode: candidate, candidate: candidate_RM })
    update_MC({ mode: candidate, candidate: candidate_RM })
    update_SVs({ candidate_values: new Map(candidate ? [['mode', candidate]] : []) })
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region RM - sanitizer -------------------------------------------------------------------------
  function sanitize_RM({ mode, candidate }: { mode: Nullable<string>; candidate: Nullable<string> }): RM_Sanitization {
    const { is_handled: is_mode_handled, sanitized: sanitized_mode } = sanitize_SM({ candidate: mode })
    const correct = get_resolved_mode(sanitized_mode.value)

    const is_correct_defined = !!correct
    const is_candidate_provided = !!candidate
    const is_candidate_correct = is_correct_defined && is_candidate_provided ? candidate === correct : undefined
    const is_correct_reverted = !is_candidate_correct
    const is_correct_resolved = sanitized_mode.is_system

    return {
      is_mode_handled,
      mode: sanitized_mode,
      candidate: { value: candidate, is_correct: is_candidate_correct },
      correct: { value: correct, is_reverted: is_correct_reverted, is_resolved: is_correct_resolved },
    }
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region RM - change handler ---------------------------------------------------------------------
  function handle_RM_change({ selector, mode, candidate: candidate_value, setter, ...opts }: { selector: Selector; mode: NullOr<string>; candidate: Nullable<string>; setter: (value: UndefinedOr<string>) => void } & ({ previous: Nullable<string> } | { getter: () => Nullable<string> })): RM_Change_Report {
    const active = 'getter' in opts

    // prettier-ignore
    const { candidate: { value: previous, is_correct: is_previous_correct } } = sanitize_RM({ mode, candidate: active ? opts.getter() : opts.previous })
    // prettier-ignore
    const {is_mode_handled, mode: used_mode, candidate: { value: candidate, is_correct: is_candidate_correct }, correct: { value: correct, is_resolved: is_correct_resolved } } = sanitize_RM({ mode, candidate: candidate_value })

    const is_correct_updated = !previous !== !correct || previous !== correct
    const is_correct_reverted = (is_mode_handled ? !is_candidate_correct : undefined) ?? false
    const did_execute = is_selector_enabled(selector) ? (active ? is_correct_updated : is_correct_reverted) : false
    if (did_execute) setter(correct)

    return {
      is_mode_handled,
      mode: used_mode,
      previous: { value: previous, is_correct: is_previous_correct },
      candidate: { value: candidate, is_correct: is_candidate_correct },
      current: { value: correct, is_resolved: is_correct_resolved, is_updated: is_correct_updated, is_reverted: is_correct_reverted },
      did_execute,
    }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - retriever -------------------------------------------------------------------------
  function retrieve_CS() {
    return html.style.colorScheme
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - updater ---------------------------------------------------------------------------
  function update_CS({ mode, candidate, previous }: { mode: NullOr<string>; candidate: Nullable<string>; previous?: Nullable<string> }) {
    const getter = retrieve_CS
    const setter: Parameters<typeof handle_RM_change>[0]['setter'] = (v) => (html.style.colorScheme = v ?? '')

    const opts = { selector: 'color-scheme', mode, candidate, setter, ...(previous !== undefined ? { previous } : { getter }) } satisfies Parameters<typeof handle_RM_change>[0]
    return handle_RM_change(opts)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - change handler --------------------------------------------------------------------
  function handle_CS_change({ mode, candidate, previous }: { mode: NullOr<string>; candidate: NullOr<string>; previous: NullOr<string> }) {
    update_CS({ mode, candidate, previous })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - mutation handler ------------------------------------------------------------------
  function handle_CS_mutation({ attributeName, oldValue: previous }: MutationRecord) {
    if (attributeName !== 'style') return
    const candidate = retrieve_CS()
    handle_CS_change({ mode: retrieve_SM(), candidate, previous })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region MC - retriever -------------------------------------------------------------------------
  function retrieve_MC() {
    const has_dark = html.classList.contains(COLOR_SCHEMES.dark)
    const has_light = html.classList.contains(COLOR_SCHEMES.light)
    if (has_dark) return COLOR_SCHEMES.dark
    if (has_light) return COLOR_SCHEMES.light
    return null
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
  // #region MC - change handler --------------------------------------------------------------------
  function handle_MC_change({ mode, candidate, previous }: { mode: NullOr<string>; candidate: NullOr<string>; previous: NullOr<string> }) {
    update_MC({ mode, candidate, previous })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region MC - mutation handler ------------------------------------------------------------------
  function handle_MC_mutation({ attributeName, oldValue: previous }: MutationRecord) {
    if (attributeName !== 'class') return
    const candidate = retrieve_MC()
    handle_MC_change({ mode: retrieve_SM(), candidate, previous })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SEs - handler --------------------------------------------------------------------------
  function handle_SEs(event: StorageEvent | Custom_SE) {
    event instanceof StorageEvent ? handle_native_SE(event) : handle_custom_SE(event)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region NATIVE_SE - handler --------------------------------------------------------------------
  function handle_native_SE({ key, newValue, oldValue }: StorageEvent) {
    if (key === mode_SK) handle_SM_change({ candidate: newValue, previous: oldValue })
    else if (key === config_SK) handle_SVs_change({ candidate_values: json_to_map(newValue), previous_values: json_to_map(oldValue) })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CUSTOM_SE - dispatcher -----------------------------------------------------------------
  function dispatch_custom_SE({ key, newValue, oldValue }: Custom_SE['detail']) {
    const event = new CustomEvent(custom_SEK, { detail: { key, newValue, oldValue } })
    window.dispatchEvent(event)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CUSTOM_SE - handler --------------------------------------------------------------------
  function handle_custom_SE(e: Custom_SE) {
    const { key, newValue, oldValue } = e.detail

    if (key === mode_SK) handle_SM_change({ candidate: newValue, previous: oldValue })
    else if (key === config_SK) handle_SVs_change({ candidate_values: json_to_map(newValue), previous_values: json_to_map(oldValue) })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region MUTATIONS - handlers -------------------------------------------------------------------
  function handle_mutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'style') handle_CS_mutation(mutation)
      else if (mutation.attributeName === 'class') handle_MC_mutation(mutation)
      else handle_TA_mutation(mutation)
    }
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

    window.addEventListener('storage', handle_SEs)
    window.addEventListener(custom_SEK, handle_SEs as EventListener)

    const observer = new MutationObserver(handle_mutations)
    observer.observe(html, { attributes: true, attributeOldValue: true, attributeFilter: [...Object.keys(config).map((k) => `data-${k}`), ...(is_selector_enabled('color-scheme') ? ['style'] : []), ...(is_selector_enabled('class') ? ['class'] : [])] })
  }
  // #endregion -------------------------------------------------------------------------------------
  init()
}
