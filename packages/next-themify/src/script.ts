import { ColorScheme } from './types/react'
import { ScriptParams, CustomSE } from './types/script'
import { Nullable, NullOr } from './types/utils'

export function script({ config, storageKeys: { configSK, modeSK }, events: { updateStorageCE, storageUpdatedCE }, behaviour: { listeners, defaultSelectors, defaultStoreMode } }: ScriptParams) {
  const target = document.documentElement

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

    const selectors = stratObj.selectors ?? defaultSelectors
    const store = stratObj.store ?? defaultStoreMode

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

  // #region VALUE - sanitizer ---------------------------------------------------------------------------
  function sanitizeValue(prop: string, value: NullOr<string>, fallback?: string) {
    const isHandled = isPropHandled(prop)
    const isAllowedValue = isHandled && !!value ? isValueAllowed(prop, value) : false
    const isAllowedFallback = isHandled && !!fallback ? isValueAllowed(prop, fallback) : false

    const preferred = constraints.get(prop)?.preferred
    const sanitizedValue = isHandled ? (isAllowedValue ? value : isAllowedFallback ? fallback : preferred) : undefined

    return {
      passed: isHandled && isAllowedValue,
      value: sanitizedValue,
    }
  }

  // #region VALUES - sanitizer --------------------------------------------------------------------------
  function sanitizeValues(values: Map<string, string>, fallbacks?: Map<string, string>) {
    const sanitizedValues = new Map<string, string>()

    for (const [prop, { preferred }] of constraints.entries()) {
      sanitizedValues.set(prop, preferred)
    }

    for (const [prop, fallback] of fallbacks?.entries() ?? []) {
      const isHandled = isPropHandled(prop)
      const isAllowed = isValueAllowed(prop, fallback)
      if (isHandled && isAllowed) sanitizedValues.set(prop, fallback)
    }

    for (const [prop, value] of values.entries()) {
      const { passed, value: sanValue } = sanitizeValue(prop, value)
      if (sanValue && passed) sanitizedValues.set(prop, sanValue)
    }

    const passed = sanitizedValues.size === values.size && Array.from(sanitizedValues.entries()).every(([prop, sanValue]) => values.get(prop) === sanValue)
    return { passed, values: sanitizedValues }
  }

  // #region SVs - getter --------------------------------------------------------------------------------
  function getSVs() {
    return jsonToMap(localStorage.getItem(configSK) ?? '')
  }

  // #region SVs - sanitizer & getter --------------------------------------------------------------------
  function getSanSVs() {
    return sanitizeValues(getSVs())
  }

  // #region SVs - setter --------------------------------------------------------------------------------
  function setSVs(values: Map<string, string>) {
    localStorage.setItem(configSK, JSON.stringify(Object.fromEntries(values)))
  }

  // #region SVs - applier -------------------------------------------------------------------------------
  function applySVs(values: Map<string, string>) {
    setSVs(values)
    setTAs(values)

    if (modeProp) {
      const { prop, store, selectors } = modeProp

      const mode = values.get(prop) as NonNullable<ReturnType<(typeof values)['get']>>
      if (store) setSM(mode)

      const RM = deriveRM(mode) as NonNullable<ReturnType<typeof deriveRM>>
      if (selectors.includes('colorScheme')) setCS(RM)
      if (selectors.includes('class')) setMC(RM)
    }
  }

  // #region TA - getter ---------------------------------------------------------------------------------
  function getTA(prop: string) {
    return target.getAttribute(`data-${prop}`)
  }

  // #region TA - setter ---------------------------------------------------------------------------------
  function setTA(prop: string, value: string) {
    target.setAttribute(`data-${prop}`, value)
  }

  // #region TA - mutation handler -----------------------------------------------------------------------
  function handleTAMutation({ attributeName }: MutationRecord) {
    const prop = attributeName?.replace('data-', '') as NonNullable<typeof attributeName>
    const newValue = getTA(prop)

    const currValue = getSVs().get(prop)
    if (currValue && newValue !== currValue) setTA(prop, currValue)
  }

  // #region TAs - setter --------------------------------------------------------------------------------
  function setTAs(values: Map<string, string>) {
    for (const [prop, value] of values.entries()) {
      setTA(prop, value)
    }
  }

  // #region SM - setter ---------------------------------------------------------------------------------
  function setSM(value: string) {
    localStorage.setItem(modeSK, value)
  }

  // #region RM - deriver --------------------------------------------------------------------------------
  function getSystemPref() {
    const supportsPref = window.matchMedia('(prefers-color-scheme)').media !== 'not all'
    return supportsPref ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : undefined
  }

  function deriveRM(mode: string) {
    if (!modeProp || !resolvedModes) return

    const { prop, stratObj } = modeProp

    const isSystemMode = stratObj.strategy === 'system' && stratObj.enableSystem && mode === (stratObj.customKeys?.system ?? 'system')
    if (isSystemMode) return getSystemPref() ?? (resolvedModes.get(stratObj.fallback) as NonNullable<ReturnType<(typeof resolvedModes)['get']>>)

    return resolvedModes.get(mode) as NonNullable<ReturnType<(typeof resolvedModes)['get']>>
  }

  // #region RM - mutation handler -----------------------------------------------------------------------
  function handleRMMutation({ getter, setter }: { getter: () => NullOr<string>; setter: (value: 'light' | 'dark') => void }) {
    if (!modeProp) return

    const newRM = getter()

    const currMode = getSVs().get(modeProp.prop)
    const correctRM = deriveRM(currMode as NonNullable<typeof currMode>)

    if (newRM !== correctRM) setter(correctRM as NonNullable<typeof correctRM>)
  }

  // #region CS - getter ---------------------------------------------------------------------------------
  function getCS() {
    return target.style.colorScheme
  }

  // #region CS - setter ---------------------------------------------------------------------------------
  function setCS(RM: ColorScheme) {
    target.style.colorScheme = RM
  }

  // #region MC - getter ---------------------------------------------------------------------------------
  function getMC() {
    return target.classList.contains('light') ? 'light' : target.classList.contains('dark') ? 'dark' : null
  }

  // #region MC - setter ---------------------------------------------------------------------------------
  function setMC(RM: ColorScheme) {
    const other = RM === 'light' ? 'dark' : 'light'
    target.classList.replace(other, RM) || target.classList.add(RM)
  }

  // #region MUTATIONS - handler -------------------------------------------------------------------------
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

  // #region EVENTS - storageUpdated - dispatcher ------------------------------------------------------
  function dispatchStorageUpdatedCE(newValue: NullOr<string>) {
    const updatedEvent = new CustomEvent<CustomSE['detail']>(storageUpdatedCE, { detail: { key: configSK, newValue } })
    window.dispatchEvent(updatedEvent)
  }

  // #region EVENTS - updateStorage - handler ------------------------------------------------------------
  function handleUpdateStorage(e: CustomSE) {
    const { key, newValue } = e.detail

    if (key !== configSK) return

    const values = jsonToMap(newValue ?? '')
    const currValues = getSVs()

    const { values: sanValues } = sanitizeValues(values, currValues)
    applySVs(sanValues)
    dispatchStorageUpdatedCE(JSON.stringify(Object.fromEntries(sanValues)))
  }

  // #region EVENTS - nativeSE - handler ----------------------------------------------------------------
  function handleNativeSE(e: StorageEvent) {
    // prettier-ignore
    switch (e.key) {
      case configSK: {
        const newValues = jsonToMap(e.newValue ?? '')
        const prevValues = jsonToMap(e.oldValue ?? '')

        const { values: sanValues } = sanitizeValues(newValues, prevValues)
        applySVs(sanValues)
        dispatchStorageUpdatedCE(JSON.stringify(Object.fromEntries(sanValues)))
      }; break;
      case modeSK: {
        if (!modeProp) return

        const newMode = e.newValue
        const prevMode = e.oldValue

        const {value: sanMode} = sanitizeValue(modeProp.prop, newMode, prevMode ?? undefined)
        const currValues = getSVs()

        const newValues = currValues.set(modeProp.prop, sanMode as NonNullable<typeof sanMode>)
        applySVs(newValues)
        dispatchStorageUpdatedCE(JSON.stringify(Object.fromEntries(newValues)))
      }; break;
      default: break;
    }
  }

  // #region EVENTS - handler ------------------------------------------------------------------------------
  function handleEvents(e: StorageEvent | CustomSE) {
    if (e instanceof StorageEvent) handleNativeSE(e)
    else handleUpdateStorage(e)
  }

  // #region INIT ------------------------------------------------------------------------------------------
  function init() {
    const { values } = getSanSVs()
    applySVs(values)

    if (listeners.includes('attributes')) {
      const observer = new MutationObserver(handleMutations)
      observer.observe(target, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: [...Array.from(constraints.keys()).map((prop) => `data-${prop}`), ...(modeProp && modeProp.selectors.includes('colorScheme') ? ['style'] : []), ...(modeProp && modeProp.selectors.includes('class') ? ['class'] : [])],
      })
    }

    if (listeners.includes('storage')) window.addEventListener('storage', handleEvents)
    window.addEventListener(updateStorageCE, handleEvents as EventListener)
  }

  init()
}
