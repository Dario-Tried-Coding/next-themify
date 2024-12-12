import { Color_Scheme } from './constants'
import { CS_Update, Custom_SE, RM_Getter, RM_Sanitization, RM_Update, Script_Params, SM_Sanitization, SM_Update, Value_Sanitization, Value_Update_Report, Values_Sanitization, Values_Update_Report } from './types/script'
import { Nullable, UndefinedOr } from './types/utils'

export function script({ config_SK, mode_SK, custom_SEK, config, constants: { STRATS, MODES, COLOR_SCHEMES } }: Script_Params) {
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
      return new Map(Object.entries(parsed).filter(([key, value]) => typeof key === 'string' && typeof value === 'string') as [string, string][])
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
  function is_available(prop: Nullable<string>, value: Nullable<string>) {
    if (!prop || !value) return undefined
    return available_values.get(prop)?.has(value)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - preferred values -----------------------------------------------------------------
  function get_preferred_values() {
    return new Map(Object.entries(config).map(([prop, obj]) => [prop, obj.strategy === STRATS.mono ? obj.key : obj.preferred]))
  }
  function get_preferred_value(prop: Nullable<string>) {
    if (!prop) return undefined
    return preferred_values.get(prop)
  }
  function is_preferred(prop: Nullable<string>, value: Nullable<string>) {
    if (!prop || !value) return false
    return preferred_values.get(prop) === value
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
  // #endregion -------------------------------------------------------------------------------------
  // #region VALUES - sanitizer ---------------------------------------------------------------------
  function sanitize_values({ candidate_values, fallback_values }: { candidate_values: Map<string, string>; fallback_values?: Map<string, string> }): Values_Sanitization {
    const ctx = { handled_props, available_values, preferred_values }
    const sanitization: Values_Sanitization['sanitization'] = new Map()

    // prettier-ignore
    const sanitization_entry = ({ prop, available, preferred, candidate_fallback, fallback, candidate, sanitized }:
    {
      prop: Value_Sanitization['prop']
      available: Value_Sanitization['available']
      preferred: Value_Sanitization['preferred']
      candidate_fallback: Value_Sanitization['candidate_fallback']['value']
      fallback: Value_Sanitization['fallback']['value']
      candidate: Value_Sanitization['candidate']['value']
      sanitized: Value_Sanitization['sanitized']['value']
      }): Value_Sanitization => {
      const is_candidate_fallback_provided = !!candidate_fallback
      const is_candidate_fallback_available = prop.is_handled ? is_available(prop.prop, candidate_fallback) : undefined
      const is_candidate_available = prop.is_handled ? is_available(prop.prop, candidate) : undefined

      return {
        prop,
        available,
        preferred,
        candidate_fallback: { is_provided: is_candidate_fallback_provided, value: candidate_fallback, is_available: is_candidate_fallback_available, is_preferred: is_candidate_fallback_provided ? is_preferred(prop.prop, candidate_fallback) : undefined },
        fallback: { value: fallback, is_reverted: is_candidate_fallback_provided ? !is_candidate_fallback_available : undefined, is_preferred: prop.is_handled ? fallback === preferred : undefined },
        candidate: { is_provided: !!candidate, value: candidate, is_available: is_candidate_available, is_fallback: is_candidate_available ? candidate === fallback : undefined, is_preferred: is_candidate_available ? candidate === preferred : undefined },
        sanitized: { is_reverted: !!candidate ? !is_candidate_available : undefined, value: sanitized, is_fallback: prop.is_handled ? sanitized === fallback : undefined, is_preferred: prop.is_handled ? sanitized === preferred : undefined },
      }
    }

    for (const [prop, candidate_fallback] of fallback_values ?? new Map<string, string>()) {
      const is_handled = is_handled_prop(prop)
      const available = get_available_values(prop as string) ?? new Set()
      const preferred = is_handled ? get_preferred_value(prop) : undefined
      const is_candidate_fallback_available = is_available(prop, candidate_fallback)
      const fallback = is_handled ? (is_candidate_fallback_available ? candidate_fallback : preferred) : undefined
      const sanitized = fallback
      sanitization.set(prop, sanitization_entry({ prop: { prop, is_handled }, available, preferred, candidate_fallback, fallback, candidate: null, sanitized }))
    }

    for (const [prop, candidate] of candidate_values) {
      const is_handled = is_handled_prop(prop)
      const available = get_available_values(prop) ?? new Set()
      const preferred = is_handled ? get_preferred_value(prop) : undefined
      const candidate_fallback = fallback_values?.get(prop)
      const is_candidate_fallback_available = is_available(prop, candidate_fallback)
      const fallback = is_handled ? (is_candidate_fallback_available ? candidate_fallback : preferred) : undefined
      const sanitized = is_handled ? (is_available(prop, candidate) ? candidate : fallback) : undefined
      sanitization.set(prop, sanitization_entry({ prop: { prop, is_handled }, available, preferred, candidate_fallback, fallback, candidate, sanitized }))
    }

    for (const prop of handled_props) {
      if (sanitization.has(prop)) continue

      const available = get_available_values(prop) ?? new Set()
      const preferred = get_preferred_value(prop)
      const candidate_fallback = fallback_values?.get(prop)
      const fallback = is_available(prop, candidate_fallback) ? candidate_fallback : preferred
      sanitization.set(prop, sanitization_entry({ prop: { prop, is_handled: true }, available, preferred, candidate_fallback, fallback, candidate: null, sanitized: fallback }))
    }

    const entries = Array.from(sanitization.entries())
    const are_ready_to_use = entries.every(([_, { candidate }]) => candidate.is_provided && candidate.is_available)

    return { ctx, performed_on: candidate_values, are_ready_to_use, sanitization }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region VALUES - change handler ----------------------------------------------------------------
  function handle_values({ new_values, setter, ...opts }: { new_values: Map<string, string>; setter: (values: Map<string, string>) => void } & ({ getter: () => Map<string, string> } | { old_values: Map<string, string> })): Values_Update_Report {
    const active = 'getter' in opts
    const old_values = active ? opts.getter() : opts.old_values
    const { ctx, sanitization } = sanitize_values({ candidate_values: new_values, fallback_values: old_values })

    // prettier-ignore
    const report_entry = ({ prop, available, preferred, previous, candidate }:
      {
        prop: Value_Update_Report['prop'];
        available: Value_Update_Report['available'];
        preferred: Value_Update_Report['preferred'];
        previous: Value_Update_Report['previous']['value'];
        candidate: Value_Update_Report['candidate']['value'];
      }): Value_Update_Report => {
      const is_previous_provided = !!previous
      const is_previous_available = is_previous_provided ? is_available(prop.prop, previous) : undefined
      const fallback = (prop.is_handled ? is_previous_available ? previous as NonNullable<typeof previous> : preferred : undefined)
      const is_candidate_next_provided = !!candidate
      const is_candidate_next_available = is_candidate_next_provided ? is_available(prop.prop, candidate) : undefined
      const next = prop.is_handled ? (is_candidate_next_available ? (candidate as NonNullable<typeof candidate>) : fallback) : undefined
      const is_reverted = prop.is_handled ? !is_candidate_next_available : undefined
      const is_updated = !previous !== !next || previous !== next

      return {
        prop,
        available,
        preferred,
        previous: { is_provided: is_previous_provided, value: previous, is_available: is_previous_provided ? is_previous_available : undefined, is_preferred: is_previous_provided ? is_preferred(prop.prop, previous) : undefined },
        fallback: { value: fallback, is_reverted: prop.is_handled ? !is_previous_available : undefined, is_preferred: prop.is_handled ? fallback === preferred : undefined },
        candidate: { is_provided: is_candidate_next_provided, value: candidate, is_available: is_candidate_next_available, is_fallback: prop.is_handled ? candidate === fallback : undefined, is_preferred: prop.is_handled ? is_preferred(prop.prop, candidate) : undefined },
        next: { value: next, is_reverted, is_updated, is_fallback: prop.is_handled ? next === fallback : undefined, is_preferred: prop.is_handled ? next === preferred : undefined },
      }
    }

    const report: Values_Update_Report['report'] = new Map()
    for (const [_, { prop, preferred, candidate_fallback, candidate }] of sanitization) {
      report.set(
        prop.prop,
        report_entry({
          prop,
          available: available_values.get(prop.prop) ?? new Set(),
          preferred,
          previous: candidate_fallback.value,
          candidate: candidate.value,
        })
      )
    }

    const entries = Array.from(report.values())
    const did_update = entries.some(({ next }) => next.is_updated)
    const did_reverte = entries.some(({ next }) => next.is_reverted)
    const did_execute = active ? did_update : did_reverte

    const candidates: Values_Update_Report['values']['candidates'] = new Map(entries.filter(({ prop, candidate }) => prop.is_handled && candidate.is_provided && candidate.is_available).map(({ prop, candidate }) => [prop.prop, candidate.value as NonNullable<typeof candidate.value>]))
    const candidates_unavailable: Values_Update_Report['values']['candidates_unavailable'] = new Map(entries.filter(({ prop, candidate }) => prop.is_handled && candidate.is_provided && !candidate.is_available).map(({ prop, candidate }) => [prop.prop, candidate.value as NonNullable<typeof candidate.value>]))
    const candidates_implicit: Values_Update_Report['values']['candidates_implicit'] = new Map(entries.filter(({ prop, candidate }) => prop.is_handled && !candidate.is_provided).map(({ prop, next }) => [prop.prop, next.value as NonNullable<typeof next.value>]))
    const candidates_ignored: Values_Update_Report['values']['candidates_ignored'] = new Map(entries.filter(({ prop, candidate }) => !prop.is_handled && candidate.is_provided).map(({ prop, candidate }) => [prop.prop, candidate.value as NonNullable<typeof candidate.value>]))
    const previous: Values_Update_Report['values']['previous'] = new Map(entries.filter(({ prop, previous }) => prop.is_handled && previous.is_provided && previous.is_available).map(({ prop, previous }) => [prop.prop, previous.value as NonNullable<typeof previous.value>]))
    const previous_unavailable: Values_Update_Report['values']['previous_unavailable'] = new Map(entries.filter(({ prop, previous }) => prop.is_handled && previous.is_provided && !previous.is_available).map(({ prop, previous }) => [prop.prop, previous.value as NonNullable<typeof previous.value>]))
    const previous_missing: Values_Update_Report['values']['previous_missing'] = new Set(entries.filter(({ prop, previous }) => prop.is_handled && !previous.is_provided).map(({ prop }) => prop.prop))
    const previous_pruned: Values_Update_Report['values']['previous_pruned'] = new Map(entries.filter(({ prop, previous }) => !prop.is_handled && previous.is_provided).map(({ prop, previous }) => [prop.prop, previous.value as NonNullable<typeof previous.value>]))
    const resolved: Values_Update_Report['values']['resolved'] = new Map(entries.filter(({ prop }) => prop.is_handled).map(({ prop, next }) => [prop.prop, next.value as NonNullable<typeof next.value>]))
    const updated: Values_Update_Report['values']['updated'] = new Map(entries.filter(({ prop, next }) => prop.is_handled && !next.is_reverted && next.is_updated).map(({ prop, next }) => [prop.prop, next.value]))
    const stale: Values_Update_Report['values']['stale'] = new Map(entries.filter(({ next }) => !next.is_updated && !next.is_reverted).map(({ prop, previous }) => [prop.prop, previous.value as NonNullable<typeof previous.value>]))
    const reverted: Values_Update_Report['values']['reverted'] = new Map(entries.filter(({ candidate, next }) => candidate.is_provided && next.is_reverted).map(({ prop, next }) => [prop.prop, next.value]))

    if (did_execute) setter(resolved)
    return { ctx, report, did_update, did_reverte, did_execute, values: { candidates, candidates_unavailable, candidates_implicit, candidates_ignored, previous, previous_unavailable, previous_missing, previous_pruned, resolved, updated, stale, reverted } }
  }
  // #endregion --------------------------------------------------------------------------------------
  // #region SVs - retriever -------------------------------------------------------------------------
  function retrieve_SVs() {
    return json_to_map(localStorage.getItem(config_SK))
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SVs - updater --------------------------------------------------------------------------
  function update_SVs({ new_values, old_values }: { new_values: Map<string, string>; old_values?: Map<string, string> }) {
    const setter: Parameters<typeof handle_values>[0]['setter'] = (values) => {
      localStorage.setItem(config_SK, JSON.stringify(Object.fromEntries(values)))
      dispatch_custom_SE({ key: config_SK, newValue: JSON.stringify(Object.fromEntries(values)), oldValue: JSON.stringify(Object.fromEntries(old_values ?? retrieve_SVs())) })
    }
    return handle_values(old_values ? { new_values, old_values, setter } : { new_values, getter: retrieve_SVs, setter })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SVs - change handler -------------------------------------------------------------------
  function handle_SVs_change({ new_values, old_values }: { new_values: Map<string, string>; old_values: Map<string, string> }) {
    const { did_execute } = update_SVs({ new_values, old_values })
    console.log('handle_SVs_change', { did_execute })
    if (did_execute) return

    update_TAs({ new_values })
    update_SM({ new_value: new_values.get('mode') })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region TA - retriever -------------------------------------------------------------------------
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
  // #region TAs - updater --------------------------------------------------------------------------
  function update_TAs({ new_values, old_values }: { new_values: Map<string, string>; old_values?: Map<string, string> }) {
    const setter: Parameters<typeof handle_values>[0]['setter'] = (values) => values.forEach((value, prop) => html.setAttribute(`data-${prop}`, value))
    return handle_values(old_values ? { new_values, old_values, setter } : { new_values, getter: retrieve_TAs, setter })
  }
  // #endregion ---------------------------------------------------------------------------------------
  // #region TAs - change handler ---------------------------------------------------------------------
  function handle_TAs_change({ new_values, old_values }: { new_values: Map<string, string>; old_values: Map<string, string> }) {
    const { did_execute } = update_TAs({ new_values, old_values })
    console.log('handle_TAs_change', { did_execute })
    if (did_execute) return

    update_SVs({ new_values })
    update_SM({ new_value: new_values.get('mode') })
  }
  // #endregion ---------------------------------------------------------------------------------------
  // #region TAs - mutation handler -------------------------------------------------------------------
  function handle_TAs_mutation(mutations: MutationRecord[]) {
    const new_values = new Map<string, string>()
    const old_values = new Map<string, string>()

    for (const { type, attributeName, oldValue: old_value } of mutations) {
      const is_attribute = type === 'attributes'
      const is_TA = is_attribute && attributeName?.startsWith('data-') && Object.keys(config).some((k) => attributeName === `data-${k}`)
      if (!is_TA) continue

      const prop = attributeName?.replace('data-', '') as string
      const new_value = html.getAttribute(attributeName as string)
      if (new_value) new_values.set(prop, new_value)
      if (old_value) old_values.set(prop, old_value)
    }

    handle_TAs_change({ new_values, old_values })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SM - retriever -------------------------------------------------------------------------
  function retrieve_SM() {
    return html.getAttribute(mode_SK)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SM - sanitizer -------------------------------------------------------------------------
  function sanitize_SM({ candidate, candidate_fallback }: { candidate: Nullable<string>; candidate_fallback?: Nullable<string> }): SM_Sanitization {
    const is_system = (value: Nullable<string>) => {
      if (!value) return undefined
      if (!(config.mode && config.mode.strategy === STRATS.light_dark && config.mode.enableSystem)) return undefined
      return value === config.mode.keys.system
    }

    const is_handled = is_handled_prop('mode')
    const available = get_available_values('mode') ?? new Set()
    const preferred = is_handled ? get_preferred_value('mode') : undefined

    const is_candidate_fallback_provided = !!candidate_fallback
    const is_candidate_fallback_available = is_candidate_fallback_provided ? is_available('mode', candidate_fallback) : undefined
    const fallback = is_handled ? (is_candidate_fallback_available ? (candidate_fallback as NonNullable<typeof candidate_fallback>) : preferred) : undefined

    const is_candidate_provided = !!candidate
    const is_candidate_available = is_handled && is_candidate_provided ? is_available('mode', candidate) : undefined

    const sanitized = is_handled ? (is_candidate_available ? (candidate as NonNullable<typeof candidate>) : fallback) : undefined

    return {
      is_handled,
      available,
      preferred,
      candidate_fallback: {
        is_provided: is_candidate_fallback_provided,
        value: candidate_fallback,
        is_available: is_candidate_fallback_available,
        is_preferred: is_handled && is_candidate_fallback_available ? candidate_fallback === preferred : undefined,
        is_system: is_handled && is_candidate_fallback_available ? is_system(candidate_fallback) : undefined,
      },
      fallback: {
        value: fallback,
        is_resolved: is_handled && is_candidate_fallback_provided ? !is_candidate_fallback_available : undefined,
        is_preferred: is_handled ? fallback === preferred : undefined,
        is_system: is_handled ? is_system(fallback) : undefined,
      },
      candidate: {
        value: candidate,
        is_available: is_candidate_available,
        is_fallback: is_handled && is_candidate_available ? candidate === fallback : undefined,
        is_preferred: is_handled && is_candidate_available ? candidate === preferred : undefined,
        is_system: is_handled && is_candidate_available ? is_system(candidate) : undefined,
      },
      sanitized: {
        value: sanitized,
        is_reverted: is_handled && !is_candidate_available,
        is_fallback: is_handled ? sanitized === fallback : undefined,
        is_preferred: is_handled ? sanitized === preferred : undefined,
        is_system: is_handled ? is_system(sanitized) : undefined,
      },
    }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SM - updater ---------------------------------------------------------------------------
  function update_SM({ new_value, old_value }: { new_value: Nullable<string>; old_value?: Nullable<string> }): SM_Update {
    const active = old_value === undefined
    const candidate_fallback = active ? retrieve_SM() : old_value
    const { is_handled, available, preferred, fallback, candidate_fallback: previous, candidate, sanitized: next } = sanitize_SM({ candidate: new_value, candidate_fallback })

    const is_updated = !previous.value !== !next.value || previous.value !== next.value
    const is_stale = next.value === previous.value
    const is_reverted = !candidate.is_available

    const did_execute = is_handled ? ((active ? is_updated : is_reverted) ?? false) : !!retrieve_SM()
    if (did_execute) {
      if (!is_handled) localStorage.removeItem(mode_SK)
      else localStorage.setItem(mode_SK, next.value as NonNullable<typeof next.value>)

      dispatch_custom_SE({ key: mode_SK, newValue: next.value, oldValue: candidate_fallback })
    }

    return { is_handled, available, preferred, fallback, previous, candidate, next: { ...next, is_updated, is_stale, is_reverted }, did_execute }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region SM - change handler --------------------------------------------------------------------
  function handle_SM_change({ new_value, old_value }: { new_value: Nullable<string>; old_value: Nullable<string> }) {
    const { did_execute } = update_SM({ new_value, old_value })
    console.log('handle_SM_change', { did_execute })
    if (did_execute) return

    const { RM } = get_RM(new_value)
    update_CS({ mode: new_value, new_value: RM })
    update_MC({ mode: new_value, new_value: RM })
    update_SVs({ new_values: new Map(new_value ? [['mode', new_value]] : []) })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region RM - resolver --------------------------------------------------------------------------
  function resolve_RM() {
    if (!(config.mode && config.mode.strategy === STRATS.light_dark && config.mode.enableSystem)) return undefined
    const supports_CSPref = window.matchMedia('(prefers-color-scheme').media !== 'not all'
    const resolved_CS = supports_CSPref ? (window.matchMedia('(prefers-color-scheme').matches && window.matchMedia('(prefers-color-scheme: dark').matches ? 'dark' : 'light') : resolved_modes.get(config.mode.fallback)
    return resolved_CS
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region RM - getter ----------------------------------------------------------------------------
  function get_RM(mode: Nullable<string>): RM_Getter {
    const is_mode_handled = is_handled_prop('mode')
    const is_mode_available = is_mode_handled ? is_available('mode', mode) : undefined
    const is_mode_system = is_mode_handled ? config.mode!.strategy === STRATS.light_dark && config.mode!.enableSystem && mode === config.mode!.keys.system : undefined
    const RM = is_mode_available ? (is_mode_system ? resolve_RM() : resolved_modes.get(mode!)) : undefined

    return { is_mode_handled, mode: { value: mode, is_available: is_mode_available, is_system: is_mode_system }, RM }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region RM - sanitizer -------------------------------------------------------------------------
  function sanitize_RM({ mode, candidate }: { mode: Nullable<string>; candidate: Nullable<string> }): RM_Sanitization {
    const { sanitized } = sanitize_SM({ candidate: mode })
    const { is_mode_handled, RM: correct } = get_RM(sanitized.value)

    const is_correct_defined = is_mode_handled
    const is_candidate_provided = !!candidate
    const is_correct = is_correct_defined && is_candidate_provided ? candidate === correct : undefined
    const is_reverted = !is_correct
    const is_resolved = sanitized.is_system

    return { is_mode_handled, mode: sanitized, candidate, is_correct, correct, is_reverted, is_resolved }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region RM - updater ---------------------------------------------------------------------------
  function update_RM({ mode, new_value, setter, ...opts }: { mode: Nullable<string>; new_value: Nullable<string>; setter: (v: UndefinedOr<Color_Scheme>) => void } & ({ old_value: Nullable<string> } | { retriever: () => Nullable<string> })): RM_Update {
    const active = 'retriever' in opts
    const { candidate: previous, is_correct: is_prev_correct } = sanitize_RM({ mode, candidate: active ? opts.retriever() : opts.old_value })
    const { is_mode_handled, mode: used_mode, candidate, is_correct: is_cand_correct, correct, is_resolved } = sanitize_RM({ mode, candidate: new_value ?? get_RM(mode).RM })

    const is_updated = !previous !== !correct || previous !== correct
    const is_reverted = !is_cand_correct
    const did_execute = active ? is_updated : is_reverted
    if (did_execute) setter(correct)

    return {
      is_mode_handled,
      mode: used_mode,
      previous: { value: previous, is_correct: is_prev_correct },
      candidate: { value: candidate, is_correct: is_cand_correct },
      next: { value: correct, is_resolved, is_updated, is_reverted },
      did_execute,
    }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - updater ---------------------------------------------------------------------------
  function update_CS({ mode, new_value, old_value }: { mode: Nullable<string>; new_value: Nullable<string>; old_value?: Nullable<string> }): CS_Update {
    const retriever = () => html.style.colorScheme
    const setter: Parameters<typeof update_RM>[0]['setter'] = (v) => (html.style.colorScheme = v ?? '')
    return update_RM(old_value ? { mode, new_value, old_value, setter } : { mode, new_value, retriever, setter })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - change handler --------------------------------------------------------------------
  function handle_CS_change({ mode, new_value, old_value }: { mode: Nullable<string>; new_value: Nullable<string>; old_value: Nullable<string> }) {
    const { did_execute } = update_CS({ mode, new_value, old_value })
    console.log('handle_CS_change', { did_execute })
    if (did_execute) return

    update_MC({ mode, new_value })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CS - mutation handler ------------------------------------------------------------------
  function handle_CS_mutation(mutations: MutationRecord[]) {
    for (const { attributeName, oldValue: old_value } of mutations) {
      if (attributeName !== 'style') continue
      const new_value = html.style.colorScheme
      handle_CS_change({ mode: retrieve_SM(), new_value, old_value })
    }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region MC - updater ---------------------------------------------------------------------------
  function update_MC({ mode, new_value, old_value }: { mode: Nullable<string>; new_value: Nullable<string>; old_value?: Nullable<string> }) {
    const retriever = () => {
      const has_dark = html.classList.contains(COLOR_SCHEMES.dark)
      const has_light = html.classList.contains(COLOR_SCHEMES.light)
      if (has_dark) return COLOR_SCHEMES.dark
      if (has_light) return COLOR_SCHEMES.light
      return undefined
    }

    const setter: Parameters<typeof update_RM>[0]['setter'] = (MC) => {
      if (!MC) {
        html.classList.remove(COLOR_SCHEMES.dark, COLOR_SCHEMES.light)
        return
      }

      html.classList.toggle(COLOR_SCHEMES.dark, MC === COLOR_SCHEMES.dark)
      html.classList.toggle(COLOR_SCHEMES.light, MC === COLOR_SCHEMES.light)
    }

    return update_RM(old_value ? { mode, new_value, old_value, setter } : { mode, new_value, retriever, setter })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region MC - change handler --------------------------------------------------------------------
  function handle_MC_change({ mode, new_value, old_value }: { mode: Nullable<string>; new_value: Nullable<string>; old_value?: Nullable<string> }) {
    const { did_execute } = update_MC({ mode, new_value, old_value })
    console.log('handle_MC_change', { did_execute })
    if (did_execute) return

    update_CS({ mode, new_value })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region MC - mutation handler ------------------------------------------------------------------
  function handle_MC_mutation(mutations: MutationRecord[]) {
    for (const { attributeName, oldValue: old_value } of mutations) {
      if (attributeName !== 'class') continue
      const new_value = html.className
      handle_MC_change({ mode: retrieve_SM(), new_value, old_value })
    }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CUSTOM_SE - dispatcher -----------------------------------------------------------------
  function dispatch_custom_SE({ key, newValue, oldValue }: Custom_SE['detail']) {
    const event = new CustomEvent(custom_SEK, { detail: { key, newValue, oldValue } })
    window.dispatchEvent(event)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region NATIVE_SE - listener -------------------------------------------------------------------
  function native_SE_listener({ key, newValue, oldValue }: StorageEvent) {
    if (key === mode_SK) handle_SM_change({ new_value: newValue, old_value: oldValue })
    else if (key === config_SK) handle_SVs_change({ new_values: json_to_map(newValue), old_values: json_to_map(oldValue) })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region CUSTOM_SE - listener -------------------------------------------------------------------
  function custom_SE_listener(e: Custom_SE) {
    const { key, newValue, oldValue } = e.detail

    if (key === mode_SK) handle_SM_change({ new_value: newValue, old_value: oldValue })
    else if (key === config_SK) handle_SVs_change({ new_values: json_to_map(newValue), old_values: json_to_map(oldValue) })
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region INITIALIZATION -------------------------------------------------------------------------
  function init() {
    const retrieved_values = retrieve_SVs()
    update_SVs({ new_values: retrieved_values })
    update_TAs({ new_values: retrieved_values })
    
    const SM = retrieved_values.get('mode')
    update_SM({ new_value: retrieved_values.get('mode') })

    const {RM} = get_RM(SM)
    update_CS({ mode: SM, new_value: RM })
    update_MC({ mode: SM, new_value: RM })

    window.addEventListener('storage', native_SE_listener)
    window.addEventListener(custom_SEK, custom_SE_listener as EventListener)

    const TAs_observer = new MutationObserver(handle_TAs_mutation)
    TAs_observer.observe(html, { attributes: true, attributeOldValue: true, attributeFilter: Object.keys(config).map((k) => `data-${k}`) })

    const MC_observer = new MutationObserver(handle_MC_mutation)
    MC_observer.observe(html, { attributes: true, attributeOldValue: true, attributeFilter: ['class'] })

    const CS_observer = new MutationObserver(handle_CS_mutation)
    CS_observer.observe(html, { attributes: true, attributeOldValue: true, attributeFilter: ['style'] })
  }
  // #endregion -------------------------------------------------------------------------------------
  init()
}
