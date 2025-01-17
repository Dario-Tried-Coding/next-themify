import { ScriptParams, CustomSE } from './types/script'

export function script({ config, storageKeys: { configSK, modeSK }, events: { updateStorageCE, storageUpdatedCE }, listeners }: ScriptParams) {
  const html = document.documentElement

  const constraints = getConstraints()
  const modeProp = getModeProp()
  const resolvedModes = getResolvedModes()

  // #region UTILS - constraints -----------------------------------------------------------------------------
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
  
  // #region UTILS - mode prop -------------------------------------------------------------------------------
  function getModeProp() {
    const prop = Object.entries(config).find(([prop, stratObj]) => stratObj.type === 'mode')?.[0]
    const stratObj = Object.values(config).find((stratObj) => stratObj.type === 'mode')
    
    if (!prop || !stratObj) return undefined
    
    const selectors = stratObj.selectors ?? ['colorScheme', 'class']
    const store = stratObj.store ?? true
    
    return { prop, stratObj, selectors, store }
  }
  
  // #region UTILS - resolved modes --------------------------------------------------------------------------
  function getResolvedModes() {
    const resolvedModes: Map<string, 'light' | 'dark'> = new Map()
    
    if (!modeProp) return
    
    const { stratObj } = modeProp
    // prettier-ignore
    switch (stratObj?.strategy) {
      case 'mono': resolvedModes.set(stratObj.key, stratObj.colorScheme); break;
      case 'multi': Object.entries(stratObj.keys).forEach(([key, colorScheme]) => resolvedModes.set(key, colorScheme)); break;
      case 'system': {
        resolvedModes.set(stratObj.customKeys?.light ?? 'light', 'light')
        resolvedModes.set(stratObj.customKeys?.dark ?? 'dark', 'dark')
        if (stratObj.customKeys?.custom) Object.entries(stratObj.customKeys.custom).forEach(([key, colorScheme]) => resolvedModes.set(key, colorScheme))
      }; break;
      default: break;
    }

    return resolvedModes
  }

  // #region UTILS --------------------------------------------------------------------------------------
  function isPropHandled(prop: string) {
    return constraints.has(prop)
  }

  function isValueAllowed(prop: string, value: string) {
    return constraints.get(prop)?.allowed.has(value) ?? false
  }
  
  // #region HELPERS ------------------------------------------------------------------------------------
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
    let passed = false
    const sanitizedValues: Map<string, string> = new Map()

    for (const [prop, { preferred }] of constraints.entries()) {
      sanitizedValues.set(prop, preferred)
    }

    for (const [prop] of sanitizedValues.entries()) {
      const value = values.get(prop)
      const candidateFallback = typeof value === 'string' ? undefined : value?.candidateFallback
      if (!candidateFallback) continue
      const sanitizedFallback = sanitizeValue({ prop, candidate: candidateFallback })
      if (sanitizedFallback) sanitizedValues.set(prop, sanitizedFallback)
    }

    for (const [prop, value] of values.entries()) {
      passed = false
      const sanitizedValue = sanitizeValue({ prop, ...(typeof value === 'string' ? { candidate: value } : value) })
      if (sanitizedValue) {
        sanitizedValues.set(prop, sanitizedValue)
        passed = true
      }
    }

    return { sanitizedValues, passed }
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

      const resolvedMode = deriveRM(sanitizedMode) as NonNullable<ReturnType<typeof deriveRM>>
      if (selectors.includes('colorScheme')) setCS(resolvedMode)
      if (selectors.includes('class')) setMC(resolvedMode)
    }
  }

  function handleSVsChange({ candidateValues, previousValues }: { candidateValues: Map<string, string>; previousValues: Map<string, string> }) {
    const payload = new Map(Array.from(candidateValues.entries()).map(([prop, candidate]) => [prop, { candidate, candidateFallback: previousValues.get(prop) }]))
    const { sanitizedValues } = sanitizeValues(payload)

    applySVs(sanitizedValues)
  }

  // #region TAs -----------------------------------------------------------------------------------------
  function getTA(prop: string) {
    return html.getAttribute(`data-${prop}`)
  }

  function setTA({ prop, value }: { prop: string; value: string }) {
    html.setAttribute(`data-${prop}`, value)
  }

  function setTAs(values: Map<string, string>) {
    for (const [prop, value] of values.entries()) {
      setTA({ prop, value })
    }
  }

  function handleTAMutation({ attributeName }: MutationRecord) {
    const prop = attributeName?.replace('data-', '') as NonNullable<typeof attributeName>
    const newValue = getTA(prop)

    const currValue = getSVs().get(prop)
    if (newValue !== currValue) setTA({ prop, value: currValue as NonNullable<typeof currValue> })
  }

  // #region SM ------------------------------------------------------------------------------------------
  function setSM(value: string) {
    localStorage.setItem(modeSK, value)
  }

  // #region RM ------------------------------------------------------------------------------------------
  function getSystemPref() {
    const supportsPref = window.matchMedia('(prefers-color-scheme)').media !== 'not all'
    return supportsPref ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : undefined
  }

  function deriveRM(mode: string) {
    if (!modeProp) return

    const { prop, stratObj } = modeProp

    const isSystemMode = stratObj.strategy === 'system' && stratObj.enableSystem && mode === (stratObj.customKeys?.system ?? 'system')
    if (isSystemMode) return getSystemPref() ?? (resolvedModes.get(stratObj.fallback) as NonNullable<ReturnType<(typeof resolvedModes)['get']>>)

    if (!constraints.get(prop)?.allowed.has(mode)) return
    return resolvedModes.get(mode) as NonNullable<ReturnType<(typeof resolvedModes)['get']>>
  }

  function handleRMMutation({ getter, setter }: { getter: () => string | undefined; setter: (value: 'light' | 'dark') => void }) {
    if (!modeProp) return

    const newCS = getter()

    const currMode = getSVs().get(modeProp.prop)
    const correctCS = deriveRM(currMode as NonNullable<typeof currMode>)

    if (newCS !== correctCS) setter(correctCS as NonNullable<typeof correctCS>)
  }

  // #region CS ------------------------------------------------------------------------------------------

  function getCS() {
    return html.style.colorScheme
  }

  function setCS(CS: 'light' | 'dark') {
    html.style.colorScheme = CS
  }

  // #region MC ------------------------------------------------------------------------------------------
  function getMC() {
    return html.classList.contains('light') ? 'light' : html.classList.contains('dark') ? 'dark' : undefined
  }

  function setMC(CS: 'light' | 'dark') {
    const other = CS === 'light' ? 'dark' : 'light'
    html.classList.replace(other, CS) || html.classList.add(CS)
  }

  // #region SEs ------------------------------------------------------------------------------------------
  function dispatchUpdatedCE({ newValue }: Omit<CustomSE['detail'], 'key'>) {
    const updatedEvent = new CustomEvent<CustomSE['detail']>(updatedStorageCEK, { detail: { key: configSK, newValue } })
    window.dispatchEvent(updatedEvent)
  }

  function handleNativeSE({ key, newValue, oldValue }: StorageEvent) {
    if (key !== configSK) return

    const candidateValues = jsonToMap(newValue ?? '')
    const previousValues = jsonToMap(oldValue ?? '')

    const validationPayload = new Map(Array.from(candidateValues.entries()).map(([prop, candidate]) => [prop, { candidate, candidateFallback: previousValues.get(prop) }]))
    const { sanitizedValues, passed } = sanitizeValues(validationPayload)

    applySVs(passed ? candidateValues : sanitizedValues)
    dispatchUpdatedCE({ newValue: passed ? newValue : JSON.stringify(Object.fromEntries(sanitizedValues)) })
  }

  function handleUpdateCSE({ detail: { key, newValue } }: CustomSE) {
    if (key !== configSK) return

    const candidateValues = jsonToMap(newValue ?? '')
    const previousValues = getSVs()

    const validationPayload = new Map(Array.from(candidateValues.entries()).map(([prop, candidate]) => [prop, { candidate, candidateFallback: previousValues.get(prop) }]))
    const { sanitizedValues } = sanitizeValues(validationPayload)

    applySVs(sanitizedValues)
    dispatchUpdatedCE({ newValue: JSON.stringify(Object.fromEntries(sanitizedValues)) })
  }

  function handleSEs(e: StorageEvent | CustomSE) {
    if (e instanceof StorageEvent) handleNativeSE(e)
    else handleUpdateCSE(e)
  }

  // #region MUTATIONS -----------------------------------------------------------------------------------
  function handleMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      // prettier-ignore
      switch (mutation.attributeName) {
        case 'style': handleRMMutation({ getter: getCS, setter: setCS }); break;
        case 'class': handleRMMutation({ getter: getMC, setter: setMC }); break;
        default: handleTAMutation(mutation); break;
      }
    }
  }

  // #region INIT ----------------------------------------------------------------------------------------
  function init() {
    const storageValues = getSVs()
    const { sanitizedValues } = sanitizeValues(storageValues)

    applySVs(sanitizedValues)

    if (listeners.includes('storage')) window.addEventListener('storage', handleSEs)
    window.addEventListener(updateStorageCEK, handleSEs as EventListener)

    const observer = new MutationObserver(handleMutations)
    if (listeners.includes('attributes'))
      observer.observe(html, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: [...Array.from(constraints.keys()).map((prop) => `data-${prop}`), ...(modeProp && modeProp.selectors.includes('colorScheme') ? ['style'] : []), ...(modeProp && modeProp.selectors.includes('class') ? ['class'] : [])],
      })
  }

  init()
}