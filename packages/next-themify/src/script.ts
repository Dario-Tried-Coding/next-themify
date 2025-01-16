import { CustomSE, ScriptParams } from './types/script'

export function script({ config, keys: { configSK, modeSK, customSEK } }: ScriptParams) {
  const html = document.documentElement

  const constraints = getConstraints()
  const modeProp = getModeProp()
  const colorSchemes = getColorSchemes()

  // #region UTILS --------------------------------------------------------------------------------------
  function getConstraints() {
    const constraints: Map<string, { preferred: string; allowed: Set<string> }> = new Map()

    // prettier-ignore
    for (const [prop, stratObj] of Object.entries(config)) {
      switch (stratObj.strategy) {
        case 'mono': constraints.set(prop, { allowed: new Set([stratObj.key]), preferred: stratObj.key }); break;
        case 'multi': constraints.set(prop, { allowed: new Set(Array.isArray(stratObj.keys) ? stratObj.keys : Object.keys(stratObj.keys)), preferred: stratObj.preferred }); break;
        case 'system': {
          constraints.set(prop, {
            allowed: new Set([
              stratObj.customKeys?.light ?? 'light',
              stratObj.customKeys?.dark ?? 'dark',
              ...(stratObj.enableSystem !== false ? [stratObj.customKeys?.system ?? 'system'] : []),
              ...(stratObj.customKeys?.custom ? Object.keys(stratObj.customKeys.custom) : []),
            ]),
            preferred: stratObj.preferred
          })
        }; break;
        default: break;
      }
    }

    return constraints
  }

  function getModeProp() {
    const prop = Object.entries(config).find(([prop, stratObj]) => stratObj.type === 'mode')?.[0]
    const stratObj = Object.values(config).find((stratObj) => stratObj.type === 'mode')

    if (!prop || !stratObj) return undefined

    const selectors = stratObj.selectors ?? ['colorScheme', 'class']
    const store = stratObj.store ?? true

    return { prop, stratObj, selectors, store }
  }

  function getColorSchemes() {
    const colorSchemes: Map<string, 'light' | 'dark'> = new Map()

    if (!modeProp) return colorSchemes

    const { stratObj } = modeProp
    // prettier-ignore
    switch (stratObj?.strategy) {
      case 'mono': colorSchemes.set(stratObj.key, stratObj.colorScheme); break;
      case 'multi': Object.entries(stratObj.keys).forEach(([key, colorScheme]) => colorSchemes.set(key, colorScheme)); break;
      case 'system': {
        colorSchemes.set(stratObj.customKeys?.light ?? 'light', 'light')
        colorSchemes.set(stratObj.customKeys?.dark ?? 'dark', 'dark')
        if (stratObj.customKeys?.custom) Object.entries(stratObj.customKeys.custom).forEach(([key, colorScheme]) => colorSchemes.set(key, colorScheme))
      }; break;
      default: break;
    }

    return colorSchemes
  }

  function jsonToMap(input: string) {
    if (!input?.trim()) return new Map<string, string>()
    try {
      const parsed = JSON.parse(input)
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') return new Map<string, string>()
      return new Map(Object.entries(parsed).filter(([key, value]) => typeof key === 'string' && typeof value === 'string') as [string, string][])
    } catch {
      return new Map<string, string>()
    }
  }

  // #region HELPERS ------------------------------------------------------------------------------------
  function isPropHandled(prop: string) {
    return constraints.has(prop)
  }

  function isValueAllowed(prop: string, value: string) {
    return constraints.get(prop)?.allowed.has(value) ?? false
  }

  // #region VALUES -------------------------------------------------------------------------------------
  function sanitizeValue({ prop, candidate, candidateFallback }: { prop: string; candidate: string; candidateFallback?: string }) {
    const isHandledProp = isPropHandled(prop)
    const preferredValue = constraints.get(prop)?.preferred
    const isCandidateAllowed = isValueAllowed(prop, candidate)
    const isCandidateFallbackAllowed = !!candidateFallback && isValueAllowed(prop, candidateFallback)

    if (!isHandledProp) return
    if (isCandidateAllowed) return candidate
    if (isCandidateFallbackAllowed) return candidateFallback
    return preferredValue as NonNullable<typeof preferredValue>
  }

  function sanitizeValues(values: Map<string, string | { candidate: string; candidateFallback?: string }>) {
    const sanitizedValues: Map<string, string> = new Map()

    for (const [prop, { preferred }] of constraints.entries()) {
      sanitizedValues.set(prop, preferred)
    }

    for (const [prop, value] of values.entries()) {
      const sanitizedValue = sanitizeValue({ prop, ...(typeof value === 'string' ? { candidate: value } : value) })
      if (sanitizedValue) sanitizedValues.set(prop, sanitizedValue)
    }

    return sanitizedValues
  }

  // #region SVs -----------------------------------------------------------------------------------------
  function getSVs() {
    return jsonToMap(localStorage.getItem(configSK) ?? '')
  }

  function setSVs(values: Map<string, string>) {
    localStorage.setItem(configSK, JSON.stringify(Object.fromEntries(values)))
  }

  function applySVs(values: Map<string, string>) {
    setSVs(values)
    setTAs(values)

    const isModeAllowed = !!modeProp
    if (isModeAllowed) {
      const { prop, store, selectors } = modeProp

      const sanitizedMode = values.get(prop) as NonNullable<ReturnType<(typeof values)['get']>>
      if (store) setSM(sanitizedMode)

      const colorScheme = getCS(sanitizedMode) as NonNullable<ReturnType<typeof getCS>>
      if (selectors.includes('colorScheme')) setCS(colorScheme)
      if (selectors.includes('class')) setMC(colorScheme)
    }
  }

  function handleSVsChange({ candidateValues, previousValues }: { candidateValues: Map<string, string>; previousValues: Map<string, string> }) {
    const payload = new Map(Array.from(candidateValues.entries()).map(([prop, candidate]) => [prop, { candidate, candidateFallback: previousValues.get(prop) }]))
    const sanitizedValues = sanitizeValues(payload)

    applySVs(sanitizedValues)
  }

  // #region TAs -----------------------------------------------------------------------------------------
  function setTA({ prop, value }: { prop: string; value: string }) {
    html.setAttribute(`data-${prop}`, value)
  }

  function setTAs(values: Map<string, string>) {
    for (const [prop, value] of values.entries()) {
      setTA({ prop, value })
    }
  }

  // #region SM ------------------------------------------------------------------------------------------
  function setSM(value: string) {
    localStorage.setItem(modeSK, value)
  }

  // #region CS ------------------------------------------------------------------------------------------
  function getSystemPref() {
    const supportsPref = window.matchMedia('(prefers-color-scheme)').media !== 'not all'
    return supportsPref ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : undefined
  }

  function getCS(mode: string) {
    if (!modeProp) return

    const { prop, stratObj } = modeProp
    if (!constraints.get(prop)?.allowed.has(mode)) return

    const isSystemMode = stratObj.strategy === 'system' && stratObj.enableSystem !== false && mode === (stratObj.enableSystem ? stratObj.customKeys?.system : 'system')

    if (isSystemMode) return getSystemPref() ?? (colorSchemes.get(stratObj.fallback) as NonNullable<ReturnType<(typeof colorSchemes)['get']>>)
    return colorSchemes.get(mode) as NonNullable<ReturnType<(typeof colorSchemes)['get']>>
  }

  function setCS(CS: 'light' | 'dark') {
    html.style.colorScheme = CS
  }

  // #region MC ------------------------------------------------------------------------------------------
  function setMC(CS: 'light' | 'dark') {
    const other = CS === 'light' ? 'dark' : 'light'
    html.classList.replace(other, CS) || html.classList.add(CS)
  }

  // #region SE ------------------------------------------------------------------------------------------
  function handleCustomSE(e: CustomSE) {
    const { key, newValue, oldValue } = e.detail
    if (key === configSK) handleSVsChange({ candidateValues: jsonToMap(newValue ?? ''), previousValues: jsonToMap(oldValue ?? '') })
  }

  // #region INIT ----------------------------------------------------------------------------------------
  function init() {
    const storageValues = getSVs()
    const sanitizedValues = sanitizeValues(storageValues)

    applySVs(sanitizedValues)

    window.addEventListener(customSEK, handleCustomSE as EventListener)
  }

  init()
}
