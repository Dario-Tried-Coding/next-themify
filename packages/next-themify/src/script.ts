import { Prop } from './types/index'
import { Available_Values, Default_Values, Handled_Props, Script_Params, Set_SVs, Set_TAs, Storage_Values, SVs_Sanitization, TA_Sanitization } from './types/script'
import { Nullable, UndefinedOr } from './types/utils'

export function script({ config_SK, mode_SK, config, constants: { STRATS, MODES, COLOR_SCHEMES } }: Script_Params) {
  const html = document.documentElement

  const handled_props = get_handled_props()
  const available_values = get_available_values()
  const default_values = get_default_values()

  // #region HELPERS --------------------------------------------------------------------------------
  function parse_JsonToMap(string: Nullable<string>): UndefinedOr<Map<string, string>> {
    if (typeof string !== 'string' || string.trim() === '') return undefined

    const map = new Map<string, string>()

    try {
      const result = JSON.parse(string)
      if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
        for (const key in result) {
          if (typeof key !== 'string' || typeof result[key] !== 'string') return undefined
          map.set(key, result[key])
        }
        return map
      }
    } catch (error) {
      return undefined
    }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS ----------------------------------------------------------------------------------
  // #region UTILS - handled props -----------------------------------------------------------------
  function get_handled_props(): Handled_Props {
    return new Set(Object.keys(config) as Prop[])
  }
  function is_handled_prop(prop: Nullable<string>) {
    if (!prop) return false
    return handled_props.has(prop as Prop)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - available values ---------------------------------------------------------------
  function get_available_values(): Available_Values {
    const available_values: Map<Prop, Set<string>> = new Map()
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
  function is_available_value(prop: Prop, value: Nullable<string>) {
    if (!value) return false
    return (available_values.get(prop) as NonNullable<ReturnType<(typeof available_values)['get']>>).has(value)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region UTILS - default values -----------------------------------------------------------------
  function get_default_values(): Default_Values {
    const default_values: Map<Prop, string> = new Map()
    for (const [key, value] of Object.entries(config)) {
      const t_key = key as Prop

      if (value.strategy === STRATS.mono) default_values.set(t_key, value.key)
      else default_values.set(t_key, value.default)
    }
    return default_values
  }
  function is_default_value(prop: Prop, value: Nullable<string>) {
    if (!value) return false
    return default_values.get(prop) === value
  }
  // #endregion -------------------------------------------------------------------------------------
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE VALUES (SVs) -------------------------------------------------------------------
  function merge_SVs(...values: Nullable<Storage_Values>[]): Storage_Values {
    const merged_values = default_values

    for (const map of values) {
      if (!map) continue
      for (const prop of handled_props) {
        if (map.has(prop)) merged_values.set(prop, map.get(prop) as NonNullable<ReturnType<(typeof map)['get']>>)
      }
    }

    return merged_values
  }
  // #region STORAGE VALUES - getter ----------------------------------------------------------------
  function get_SVs(): UndefinedOr<Map<string, string>> {
    const storage_string = localStorage.getItem(config_SK)
    return parse_JsonToMap(storage_string)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE VALUES - sanitizer ------------------------------------------------------------
  function sanitize_SVs(prov_values: Nullable<Map<string, string>>): SVs_Sanitization {
    const values: SVs_Sanitization['values'] = new Map()

    for (const [prop, default_value] of default_values) {
      const available_prop_values = available_values.get(prop) as NonNullable<ReturnType<(typeof available_values)['get']>>
      const debug_props: NonNullable<ReturnType<SVs_Sanitization['values']['get']>> = {
        prop,
        was_provided: false,
        is_handled: true,
        value: undefined,
        was_valid: false,
        sanitized_value: default_value,
        is_fallback: true,
        available_values: available_prop_values,
        default_value,
      }
      values.set(prop, debug_props)
    }

    if (!prov_values) return { handled_props, performed_on: prov_values, values, were_all_valid: false }

    for (const [prop, value] of prov_values) {
      if (!is_handled_prop(prop)) {
        const debug_props: NonNullable<ReturnType<SVs_Sanitization['values']['get']>> = {
          prop,
          was_provided: true,
          is_handled: false,
          value,
          was_valid: false,
          sanitized_value: undefined,
          is_fallback: undefined,
          available_values: undefined,
          default_value: undefined,
        }
        values.set(prop, debug_props)
        continue
      }

      const handled_prop = prop as Prop
      const available_prop_values = available_values.get(handled_prop) as NonNullable<ReturnType<(typeof available_values)['get']>>
      const default_value = default_values.get(handled_prop) as NonNullable<ReturnType<(typeof default_values)['get']>>
      if (!is_available_value(handled_prop, value)) {
        const debug_props: NonNullable<ReturnType<SVs_Sanitization['values']['get']>> = {
          prop,
          was_provided: true,
          is_handled: true,
          value,
          was_valid: false,
          sanitized_value: default_value,
          is_fallback: true,
          available_values: available_prop_values,
          default_value,
        }
        values.set(handled_prop, debug_props)
        continue
      }

      const debug_props: NonNullable<ReturnType<SVs_Sanitization['values']['get']>> = {
        prop,
        was_provided: true,
        is_handled: true,
        value,
        was_valid: true,
        sanitized_value: value,
        is_fallback: false,
        available_values: available_prop_values,
        default_value,
      }
      values.set(prop, debug_props)
    }

    const were_all_valid = Array.from(values.values()).every((i) => i.was_valid)
    return { handled_props, performed_on: prov_values, values, were_all_valid }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region STORAGE VALUES - setter ----------------------------------------------------------------
  function set_SVs(prov_values: Storage_Values): Set_SVs {
    const values: Set_SVs['values'] = new Map()

    const curr_values = sanitize_SVs(get_SVs()).values
    for (const [prop, value] of prov_values) {
      
    }
  }
  // function set_SVs(prov_values: Nullable<Storage_Values>): Set_SVs {
  //   const values: Set_SVs['values'] = new Map()

  //   const { values: curr_values } = sanitize_SVs(get_SVs())
  //   if (!prov_values) {
  //     for (const [prop, default_value] of default_values) {
  //       const available_prop_values = available_values.get(prop) as NonNullable<ReturnType<(typeof available_values)['get']>>
  //       const old_value = curr_values?.get(prop)?.value
  //       const old_valid = curr_values?.get(prop)?.is_valid ?? false
  //       const was_updated = old_value !== default_value
  //       values.set(prop, {
  //         prop,
  //         was_provided: false,
  //         is_handled: true,
  //         old: { value: old_value, was_valid: old_valid },
  //         new: { value: undefined, was_valid: false },
  //         updated_value: default_value,
  //         got_updated: true,
  //         is_fallback: true,
  //         available_values: available_prop_values,
  //         default_value,
  //       })
  //     }
  //     localStorage.setItem(config_SK, JSON.stringify(Object.fromEntries(default_values)))

  //     return { handled_props, values }
  //   }
  // }
  // console.log(set_SVs(undefined))
  // function set_SVs(values: Storage_Values): Set_SVs {
  //   const info: Set_SVs['info'] = new Map()
  //   const storage_values: Storage_Values = new Map()
  //   let must_update = false

  //   const { results } = sanitize_SVs(get_SVs())
  //   for (const prop of handled_props) {
  //     const retrieved_value = results?.get(prop)?.value
  //     const provided_value = values.get(prop) as NonNullable<ReturnType<(typeof values)['get']>>
  //     const available_values = get_available_values().get(prop) as NonNullable<ReturnType<ReturnType<typeof get_available_values>['get']>>
  //     const was_valid = results?.get(prop)?.valid ?? false
  //     const is_same = retrieved_value === provided_value
  //     const must_be_updated = !was_valid || (was_valid && !is_same)

  //     if (must_be_updated) {
  //       info.set(prop, { retrieved_value, provided_value, available_values, was_valid, is_same, updated: true })
  //       storage_values.set(prop, provided_value)
  //       must_update = true
  //       continue
  //     }

  //     info.set(prop, { retrieved_value, provided_value, available_values, was_valid, is_same, updated: false })
  //     storage_values.set(prop, retrieved_value as NonNullable<typeof retrieved_value>)
  //   }

  //   if (must_update) {
  //     localStorage.setItem(config_SK, JSON.stringify(Object.fromEntries(storage_values)))
  //     return { updated: true, updated_with: storage_values, info }
  //   }
  //   return { updated: false, sticked_with: values, info }
  // }
  // #endregion -------------------------------------------------------------------------------------
  // #endregion -------------------------------------------------------------------------------------
  // #region THEME ATTRIBUTES (TAs) -----------------------------------------------------------------
  // #region THEME ATTRIBUTES - getter -------------------------------------------------------------
  function get_TA(prop: Prop): Nullable<string> {
    return html.getAttribute(`data-${prop}`)
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region THEME ATTRIBUTES - sanitizer ----------------------------------------------------------
  function sanitize_TA({ prop, value }: { prop: Prop; value: Nullable<string> }): TA_Sanitization {
    if (!handled_props.has(prop) || !value) return { results: { prop, is_handled: false, value, valid: false }, valid: false, fallback_value: undefined, default_value: undefined, available_values: undefined, handled_props }

    const available_prop_values = available_values.get(prop) as NonNullable<ReturnType<ReturnType<typeof get_available_values>['get']>>
    const default_value = default_values.get(prop) as NonNullable<ReturnType<(typeof default_values)['get']>>
    const fallback_value = default_values.get(prop) as NonNullable<ReturnType<(typeof default_values)['get']>>

    const valid = available_values.get(prop)?.has(value) ?? false
    if (!valid) return { results: { prop, is_handled: true, value, valid: false }, valid: false, fallback_value, default_value, available_values: available_prop_values, handled_props }

    return { results: { prop, is_handled: true, value, valid: true }, valid: true, sanitized_value: value, default_value, available_values: available_prop_values, handled_props }
  }
  // #endregion -------------------------------------------------------------------------------------
  // #region THEME ATTRIBUTES - setter -------------------------------------------------------------
  function set_TAs(values: Storage_Values): Set_TAs {
    const info: Set_TAs = new Map()

    for (const prop of handled_props) {
      const value = get_TA(prop)
      const { results, available_values } = sanitize_TA({ prop, value }) as {
        results: ReturnType<typeof sanitize_TA>['results']
        available_values: NonNullable<ReturnType<typeof sanitize_TA>['available_values']>
      }
      const retrieved_value = results.value
      const provided_value = values.get(prop) as NonNullable<ReturnType<(typeof values)['get']>>
      const was_valid = results.valid
      const is_same = retrieved_value === provided_value
      const must_update = !was_valid || (was_valid && !is_same)

      if (must_update) {
        info.set(prop, { retrieved_value, provided_value, available_values, was_valid, is_same, updated: true })
        html.setAttribute(`data-${prop}`, provided_value)
        continue
      }

      info.set(prop, { retrieved_value, provided_value, available_values, was_valid, is_same, updated: false })
    }

    return info
  }
  // #endregion -------------------------------------------------------------------------------------
  // #endregion -------------------------------------------------------------------------------------
  // #region INITIALIZATION -------------------------------------------------------------------------
  // function init() {
  //   const current_values = get_SVs()
  //   const { results } = sanitize_SVs(current_values)
  //   set_SVs(sanitized_values)
  //   set_TAs(sanitized_values)
  // }

  // #endregion -------------------------------------------------------------------------------------

  // init()
}
