import { ColorScheme } from './types/react'
import { ScriptParams, Store } from './types/script'
import { NullOr, UndefinedOr } from './types/utils'

export function script({ config: { constraints, modeConfig }, storageKeys, events, observers }: ScriptParams) {
  const target = document.documentElement

  class ValidationManager {
    jsonToObj(json: NullOr<string>) {
      if (!json?.trim()) return {}
      try {
        const parsed = JSON.parse(json)
        if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') return {}
        return Object.fromEntries(Object.entries(parsed).filter(([key, value]) => typeof key === 'string' && typeof value === 'string')) as Record<string, string>
      } catch {
        return {}
      }
    }

    isSameObj(obj1: Record<string, string>, obj2: Record<string, string>) {
      if (obj1 === obj2) return true

      const keys1 = Object.keys(obj1)
      const keys2 = Object.keys(obj2)

      if (keys1.length !== keys2.length) return false

      for (const key of keys1) {
        if (!keys2.includes(key) || obj1[key] !== obj2[key]) return false
      }

      return true
    }

    validateValue(prop: string, value: string, fallback?: string) {
      const isHandled = Object.keys(constraints).includes(prop)
      const isAllowed = isHandled && !!value ? constraints[prop]!.allowed.includes(value) : false
      const isAllowedFallback = isHandled && !!fallback ? constraints[prop]!.allowed.includes(fallback) : false

      const preferred = isHandled ? constraints[prop]!.preferred : undefined
      const valValue = !isHandled ? undefined : isAllowed ? (value as NonNullable<typeof value>) : isAllowedFallback ? (fallback as NonNullable<typeof fallback>) : preferred

      return { passed: isHandled && isAllowed, value: valValue }
    }

    validateObj(values: Record<string, string>, fallbacks?: Record<string, string>) {
      const results: Record<string, { passed: boolean; value: string }> = {}
      const sanValues: Record<string, string> = {}

      for (const [prop, { preferred }] of Object.entries(constraints)) {
        results[prop] = { passed: false, value: undefined as unknown as string }
        sanValues[prop] = preferred
      }

      for (const [prop, fallback] of fallbacks ? Object.entries(fallbacks) : []) {
        const { passed, value: sanValue } = this.validateValue(prop, fallback)
        results[prop] = { passed, value: fallback }
        if (sanValue) sanValues[prop] = sanValue
      }

      for (const [prop, value] of Object.entries(values)) {
        const { passed, value: sanValue } = this.validateValue(prop, value, fallbacks?.[prop])
        results[prop] = { passed, value }
        if (sanValue) sanValues[prop] = sanValue
      }

      const passed = Object.values(results).every(({ passed }) => passed)

      return { passed, values: sanValues, results }
    }
  }

  class StateManager {
    private _state: NullOr<Record<string, string>>

    constructor() {
      this._state = null
    }

    get state(): StateManager['_state'] {
      return this._state
    }

    set state(state: Record<string, string>) {
      const newState = { ...this._state, ...state }
      this._state = newState
    }
  }

  class StorageManager {
    #retrieve(key: string) {
      return localStorage.getItem(key)
    }
    #store(key: string, value: string) {
      localStorage.setItem(key, value)
    }

    retrieveState() {
      return this.#retrieve(storageKeys.state)
    }

    storeState(value: string, mode?: string) {
      const isStored = this.#retrieve(storageKeys.state) === value
      if (!isStored) this.#store(storageKeys.state, value)
      
      if (mode && modeConfig?.store) this.#store(storageKeys.mode, mode)
    }
  }

  class RMManager {
    #getSystemPref() {
      const supportsPref = window.matchMedia('(prefers-color-scheme)').media !== 'not all'
      return supportsPref ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : undefined
    }

    deriveRM(mode: string) {
      if (!modeConfig) return
      const { stratObj, resolvedModes } = modeConfig

      const isSystemMode = stratObj.strategy === 'system' && stratObj.enableSystem && mode === (stratObj.customKeys?.system ?? 'system')
      if (isSystemMode) return this.#getSystemPref() ?? resolvedModes[stratObj.fallback]

      return resolvedModes[mode]
    }
  }

  class DOMManager extends RMManager {
    #setCS(RM: ColorScheme) {
      const isSet = target.style.colorScheme === RM
      if (!isSet) target.style.colorScheme = RM
    }

    #setMC(RM: ColorScheme) {
      const isSet = target.classList.contains('light') ? 'light' : target.classList.contains('dark') ? 'dark' : undefined
      if (isSet === RM) return

      const other = RM === 'light' ? 'dark' : 'light'
      target.classList.replace(other, RM) || target.classList.add(RM)
    }

    setAttr(prop: string, value: string) {
      const isSet = target.getAttribute(`data-${prop}`) === value
      if (!isSet) {
        target.setAttribute(`data-${prop}`, value)

        const isMode = modeConfig?.prop === prop
        if (isMode) {
          const RM = this.deriveRM(value) as NonNullable<ReturnType<DOMManager['deriveRM']>>
          if (modeConfig?.selectors.includes('colorScheme')) this.#setCS(RM)
          if (modeConfig?.selectors.includes('class')) this.#setMC(RM)
        }
      }
    }

    setAttrs(values: Record<string, string>) {
      for (const [prop, value] of Object.entries(values)) this.setAttr(prop, value)
    }
  }

  class ThemingStore {
    private validation: ValidationManager
    private storage: StorageManager
    private state: StateManager
    private DOM: DOMManager

    constructor() {
      this.validation = new ValidationManager()
      this.storage = new StorageManager()
      this.state = new StateManager()
      this.DOM = new DOMManager()
    }

    init() {
      const { values } = this.validation.validateObj(this.validation.jsonToObj(this.storage.retrieveState()))
      
      this.storage.storeState(JSON.stringify(values), values[modeConfig?.prop ?? ''])
      this.state.state = values
      this.DOM.setAttrs(values)
    }
  }

  const themingStore = new ThemingStore()
  themingStore.init()
}
