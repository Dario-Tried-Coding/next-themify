import { Constraints } from '../types/core'

export const genValidation = (constraints: Constraints) => {
  const validateValue = (prop: string, value: string, fallback?: string) => {
    const isHandled = Object.keys(constraints).includes(prop)
    const isAllowed = isHandled && !!value ? constraints.get(prop)!.available.has(value) : false
    const isAllowedFallback = isHandled && !!fallback ? constraints.get(prop)!.available.has(fallback) : false

    const base = isHandled ? constraints.get(prop)!.base : undefined
    const valValue = !isHandled ? undefined : isAllowed ? (value as NonNullable<typeof value>) : isAllowedFallback ? (fallback as NonNullable<typeof fallback>) : base

    return { passed: isHandled && isAllowed, value: valValue }
  }

  const validateValues = (values: Map<string, string>, fallbacks?: Map<string, string>) => {
    const results: Map<string, { passed: boolean; value: string }> = new Map()
    const sanValues: Map<string, string> = new Map()

    for (const [prop, { base }] of constraints.entries()) {
      results.set(prop, { passed: false, value: undefined as unknown as string })
      sanValues.set(prop, base)
    }

    for (const [prop, fallback] of fallbacks?.entries() ?? []) {
      const { passed, value: sanValue } = validateValue(prop, fallback)
      results.set(prop, { passed, value: fallback })
      if (sanValue) sanValues.set(prop, sanValue)
    }

    for (const [prop, value] of values.entries()) {
      const { passed, value: sanValue } = validateValue(prop, value, fallbacks?.get(prop))
      results.set(prop, { passed, value })
      if (sanValue) sanValues.set(prop, sanValue)
    }

    const passed = Object.values(results).every(({ passed }) => passed)

    return { passed, values: sanValues, results }
  }

  return { validateValue, validateValues }
}