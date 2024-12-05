import { Color_Scheme } from './constants'
import { Script_Params, Value_Sanitization, Value_Update_Report, Values_Sanitization, Values_Update } from './types/script'
import { Nullable, UndefinedOr } from './types/utils'

export function script({ config_SK, mode_SK, custom_SEK, config, constants: { STRATS, MODES, COLOR_SCHEMES } }: Script_Params) {
  const html = document.documentElement

  const handled_props = get_handled_props()
  const available_values = get_available_values()
  const default_values = get_default_values()
  const color_schemes = get_color_schemes()

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
  function is_available_value(prop: Nullable<string>, value: Nullable<string>) {
    if (!prop || !value) return undefined
    return available_values.get(prop)?.has(value)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - default values -----------------------------------------------------------------
  function get_default_values() {
    return new Map(Object.entries(config).map(([prop, obj]) => [prop, obj.strategy === STRATS.mono ? obj.key : obj.default]))
  }
  function get_default_value(prop: Nullable<string>) {
    if (!prop) return undefined
    return default_values.get(prop)
  }
  function is_default_value(prop: Nullable<string>, value: Nullable<string>) {
    if (!prop || !value) return false
    return default_values.get(prop) === value
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - color schemes ------------------------------------------------------------------
  function get_color_schemes() {
    const color_schemes: Map<string, Color_Scheme> = new Map()
    // prettier-ignore
    switch (config.mode?.strategy) {
      case STRATS.mono: color_schemes.set(config.mode.key, config.mode.colorScheme); break
      case STRATS.custom: config.mode.keys.forEach(({ key, colorScheme }) => color_schemes.set(key, colorScheme)); break
      case STRATS.light_dark: Object.entries(config.mode.keys).forEach(([key, i]) => {
          if (typeof i !== 'string') i.forEach(({ key, colorScheme }) => color_schemes.set(key, colorScheme))
          else if (Object.values(COLOR_SCHEMES).includes(key as Color_Scheme)) color_schemes.set(i, key as Color_Scheme)
        }); break
      default: break
    }
    return color_schemes
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region VALUES - sanitizer ---------------------------------------------------------------------
  function sanitize_values(candidate_values: Map<string, string>, opts?: { fallback_values?: Map<string, string> }): Values_Sanitization {
    const ctx = { handled_props, available_values, default_values }
    const sanitization: Values_Sanitization['values']['sanitization'] = new Map()

    // prettier-ignore
    const sanitization_entry = (
      { prop, candidate_value: { value, is_available, is_provided }, available_values, default_value, fallback_value, sanitized_value: { value: sanitized_value, is_reverted } }:
      {
        prop: { prop: string; is_handled: boolean };
        available_values: Set<string>;
        default_value: UndefinedOr<string>;
        fallback_value: { is_provided: boolean; candidate: UndefinedOr<string>; is_available: UndefinedOr<boolean>; is_resolved: UndefinedOr<boolean>, resolved: UndefinedOr<string> };
        candidate_value: { is_provided: boolean; value: Nullable<string>; is_available: UndefinedOr<boolean> };
        sanitized_value: { value: UndefinedOr<string>; is_reverted: UndefinedOr<boolean> }
      }
    ): Value_Sanitization => ({
      prop,
      available_values,
      default_value,
      fallback_value,
      candidate_value: { is_provided, value, is_available, is_fallback: prop.is_handled ? value === fallback_value.resolved : undefined, is_default: prop.is_handled ? value === default_value : undefined },
      sanitized_value: { value: sanitized_value, is_reverted, is_fallback: prop.is_handled ? sanitized_value === fallback_value.resolved : undefined, is_default: prop.is_handled ? sanitized_value === default_value : undefined }
    })

    for (const [prop, candidate] of opts?.fallback_values ?? new Map<string, string>()) {
      const is_handled = is_handled_prop(prop)
      const available_values = get_available_values(prop as string) ?? new Set()
      const default_value = get_default_value(prop)
      const is_available = is_available_value(prop, candidate)
      const resolved = is_handled && is_available ? candidate : default_value
      const is_resolved = is_handled && is_available && resolved === candidate
      const sanitized = resolved
      sanitization.set(
        prop,
        sanitization_entry({
          prop: { prop, is_handled },
          available_values,
          default_value,
          fallback_value: { is_provided: true, candidate, is_available, is_resolved, resolved },
          candidate_value: { is_provided: false, value: null, is_available: undefined },
          sanitized_value: { value: sanitized, is_reverted: true },
        })
      )
    }

    for (const [prop, candidate_value] of candidate_values) {
      const is_handled = is_handled_prop(prop)
      const available_values = get_available_values(prop) ?? new Set()
      const default_value = get_default_value(prop)
      const candidate_fallback = opts?.fallback_values?.get(prop)
      const is_fallback_provided = !!candidate_fallback
      const is_candidate_fallback_available = is_available_value(prop, candidate_fallback)
      const resolved_fallback = is_candidate_fallback_available ? candidate_fallback : default_value
      // TODO: Make it undefined if not handled
      const is_candidate_fallback_resolved = is_handled && is_candidate_fallback_available && candidate_fallback === resolved_fallback
      const is_available = is_available_value(prop, candidate_value)
      const sanitized = is_available ? candidate_value : resolved_fallback
      const is_reverted = !is_available
      sanitization.set(
        prop,
        sanitization_entry({
          prop: { prop, is_handled },
          available_values,
          default_value,
          fallback_value: { is_provided: is_fallback_provided, candidate: candidate_fallback, is_available: is_candidate_fallback_available, is_resolved: is_candidate_fallback_resolved, resolved: resolved_fallback },
          candidate_value: { is_provided: true, value: candidate_value, is_available },
          sanitized_value: { value: sanitized, is_reverted },
        })
      )
    }

    for (const prop of handled_props) {
      if (sanitization.has(prop)) continue

      const available_values = get_available_values(prop) ?? new Set()
      const default_value = get_default_value(prop)
      const candidate_fallback = opts?.fallback_values?.get(prop)
      const is_fallback_provided = !!candidate_fallback
      const is_candidate_fallback_available = is_available_value(prop, candidate_fallback)
      const resolved_fallback = is_candidate_fallback_available ? candidate_fallback : default_value
      const is_candidate_fallback_resolved = is_candidate_fallback_available && candidate_fallback === resolved_fallback
      const sanitized = resolved_fallback
      sanitization.set(
        prop,
        sanitization_entry({
          prop: { prop, is_handled: true },
          available_values,
          default_value,
          fallback_value: { is_provided: is_fallback_provided, candidate: candidate_fallback, is_available: is_candidate_fallback_available, is_resolved: is_candidate_fallback_resolved, resolved: resolved_fallback },
          candidate_value: { is_provided: false, value: null, is_available: undefined },
          sanitized_value: { value: sanitized, is_reverted: true },
        })
      )
    }

    const entries = Array.from(sanitization.entries())
    const are_ready_to_use = entries.every(([_, { candidate_value }]) => candidate_value.is_provided && candidate_value.is_available)

    const create_map = ({ filter, map }: { filter: (entry: Value_Sanitization) => boolean; map: (entry: Value_Sanitization) => [string, string] }) => new Map(entries.filter(([_, sanitization]) => filter(sanitization)).map(([_, sanitization]) => map(sanitization)))

    const missing = create_map({ filter: ({ prop, candidate_value }) => prop.is_handled && !candidate_value.is_provided, map: ({ prop, sanitized_value }) => [prop.prop, sanitized_value.value as NonNullable<typeof sanitized_value.value>] })
    const handled = create_map({ filter: ({ prop }) => prop.is_handled, map: ({ prop, sanitized_value }) => [prop.prop, sanitized_value.value as NonNullable<typeof sanitized_value.value>] })
    const not_handled = create_map({ filter: ({ prop }) => !prop.is_handled, map: ({ prop, candidate_value }) => [prop.prop, candidate_value.value as NonNullable<typeof candidate_value.value>] })

    return { ctx, performed_on: { values: candidate_values, are_ready_to_use }, values: { sanitization, missing, handled, not_handled } }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region VALUES - change handler ----------------------------------------------------------------
  function handle_CV({ old_values, new_values, setter }: { old_values: Map<string, string>; new_values: Map<string, string>; setter: (handled_values: Map<string, string>) => void }, opts: { active: boolean }): Values_Update {
    // prettier-ignore
    const { values: { sanitization }, ctx } = sanitize_values(new_values, { fallback_values: old_values })
    // prettier-ignore
    const sanitization_entry = ({ prop, available_values, default_value, fallback_value, old_value, new_value, updated_value }:
    {
      prop: { prop: string; is_handled: boolean }
      available_values: Set<string>
      default_value: UndefinedOr<string>
      fallback_value: UndefinedOr<string>
      old_value: { is_provided: boolean; value: Nullable<string>; is_available: UndefinedOr<boolean> }
      new_value: { is_provided: boolean; value: Nullable<string>; is_available: UndefinedOr<boolean> }
      updated_value: { value: UndefinedOr<string>; is_reverted: UndefinedOr<boolean>; was_updated: boolean }
    }): Value_Update_Report => ({
      prop,
      available_values,
      default_value,
      fallback_value,
      old_value: { ...old_value, is_fallback: !fallback_value || !old_value.value ? undefined : old_value.value === fallback_value, is_default: !default_value || !old_value.value ? undefined : old_value.value === default_value },
      new_value: { ...new_value, is_fallback: !fallback_value || !new_value.value ? undefined : new_value.value === fallback_value, is_default: !default_value || !new_value.value ? undefined : new_value.value === default_value, is_same: (!old_value.value && !new_value.value) || new_value.value === old_value.value },
      updated_value: { ...updated_value, is_fallback: !fallback_value || !updated_value.value ? undefined : updated_value.value === fallback_value, is_default: !default_value || !updated_value.value ? undefined : updated_value.value === default_value, is_same: (!old_value.value && !updated_value.value) || updated_value.value === old_value.value },
    })

    const report: Values_Update['values']['report'] = new Map()
    for (const [_, { prop, available_values, default_value, fallback_value, candidate_value, sanitized_value }] of sanitization) {
      const old_value = { is_provided: fallback_value.is_provided, value: fallback_value.candidate, is_available: fallback_value.is_available, is_fallback: fallback_value.is_resolved }
      const new_value = { is_provided: candidate_value.is_provided, value: candidate_value.value, is_available: candidate_value.is_available }
      const was_updated = opts.active ? !old_value.is_available || (old_value.is_available && !!new_value.is_available && old_value.value !== new_value.value) : prop.is_handled && !new_value.is_available
      const updated_value = { value: sanitized_value.value, is_reverted: sanitized_value.is_reverted, was_updated }
      report.set(prop.prop, sanitization_entry({ prop, available_values, default_value, fallback_value: fallback_value.resolved, old_value, new_value, updated_value }))
    }

    const entries = Array.from(report.values())
    const performed_update = entries.some(({ updated_value }) => updated_value.was_updated)

    const candidates: Values_Update['values']['candidates'] = {
      values: new_values,
      missing: new Set(entries.filter(({ prop, new_value }) => prop.is_handled && !new_value.is_provided).map(({ prop }) => prop.prop)),
      not_handled: new Map(entries.filter(({ prop, new_value }) => new_value.is_provided && !prop.is_handled).map(({ prop, new_value }) => [prop.prop, new_value.value as NonNullable<typeof new_value.value>])),
      not_available: new Map(entries.filter(({ new_value }) => new_value.is_provided && !new_value.is_available).map(({ prop, new_value }) => [prop.prop, new_value.value])),
    }
    const previous: Values_Update['values']['previous'] = {
      values: old_values,
      missing: new Set(entries.filter(({ prop, old_value }) => prop.is_handled && !old_value.is_provided).map(({ prop }) => prop.prop)),
      not_handled: new Map(entries.filter(({ prop, old_value }) => old_value.is_provided && !prop.is_handled).map(({ prop, old_value }) => [prop.prop, old_value.value as NonNullable<typeof old_value.value>])),
      not_available: new Map(entries.filter(({ old_value }) => old_value.is_provided && !old_value.is_available).map(({ prop, old_value }) => [prop.prop, old_value.value])),
    }
    const resolved: Values_Update['values']['resolved'] = {
      values: new Map(entries.filter(({ prop }) => prop.is_handled).map(({ prop, updated_value }) => [prop.prop, updated_value.value as NonNullable<typeof updated_value.value>])),
      pruned: new Map(entries.filter(({ prop, old_value }) => !prop.is_handled && old_value.is_provided).map(({ prop, old_value }) => [prop.prop, old_value.value as NonNullable<typeof old_value.value>])),
      updated: new Map(entries.filter(({ prop, updated_value }) => prop.is_handled && updated_value.was_updated).map(({ prop, updated_value }) => [prop.prop, updated_value.value])),
      not_updated: new Map(entries.filter(({ prop, updated_value }) => prop.is_handled && !updated_value.was_updated).map(({ prop, updated_value }) => [prop.prop, updated_value.value as NonNullable<typeof updated_value.value>])),
    }

    return { ctx, performed_update, values: { report, candidates, previous, resolved } }
  }
  console.log(
    handle_CV(
      {
        old_values: new Map([
          ['theme', 'default'],
          ['mode', 'dark'],
          ['colorScheme', 'dark'],
        ]),
        new_values: new Map([['mode', 'dark']]),
        setter() {},
      },
      { active: true }
    )
  )
  // #endregion -------------------------------------------------------------------------------------
}
