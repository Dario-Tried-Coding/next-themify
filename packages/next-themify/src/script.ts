import { ColorScheme } from './types/react'
import { CustomSE, ScriptParams, StateSync_Event, Store, StoreMethods } from './types/script'

export function script({ config, storageKeys, events, defaultBehaviour }: ScriptParams) {
  class ThemingStore {
    private store: Store
    private target: HTMLElement
    private methods: StoreMethods

    constructor(params: Omit<Store, 'state'>) {
      this.target = document.documentElement
      this.store = { state: null, ...params }

      this.methods = {
        utils: {
          jsonToObj: (json: string) => {
            if (!json?.trim()) return {}
            try {
              const parsed = JSON.parse(json)
              if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') return {}
              return Object.fromEntries(Object.entries(parsed).filter(([key, value]) => typeof key === 'string' && typeof value === 'string')) as Record<string, string>
            } catch {
              return {}
            }
          },
          isSameObj: (obj1: Record<string, string>, obj2: Record<string, string>) => {
            if (obj1 === obj2) return true

            const keys1 = Object.keys(obj1)
            const keys2 = Object.keys(obj2)

            if (keys1.length !== keys2.length) return false

            for (const key of keys1) {
              if (!keys2.includes(key) || obj1[key] !== obj2[key]) return false
            }

            return true
          },
        },
        values: {
          sanitize: {
            mono: (prop, value, fallback) => {
              const isHandled = Object.keys(this.store.constraints).includes(prop)
              const isAllowed = isHandled && !!value ? this.store.constraints[prop]!.allowed.includes(value) : false
              const isAllowedFallback = isHandled && !!fallback ? this.store.constraints[prop]!.allowed.includes(fallback) : false

              const preferred = isHandled ? this.store.constraints[prop]!.preferred : undefined
              const sanValue = !isHandled ? undefined : isAllowed ? (value as NonNullable<typeof value>) : isAllowedFallback ? (fallback as NonNullable<typeof fallback>) : preferred

              return { passed: isHandled && isAllowed, value: sanValue }
            },
            multi: (values: Record<string, string>, fallbacks?: Record<string, string>) => {
              const results: Record<string, { passed: boolean; value: string }> = {}
              const sanValues: Record<string, string> = {}

              for (const [prop, { preferred }] of Object.entries(this.store.constraints)) {
                results[prop] = { passed: false, value: undefined as unknown as string }
                sanValues[prop] = preferred
              }

              for (const [prop, fallback] of fallbacks ? Object.entries(fallbacks) : []) {
                const { passed, value: sanValue } = this.methods.values.sanitize.mono(prop, fallback)
                results[prop] = { passed, value: fallback }
                if (sanValue) sanValues[prop] = sanValue
              }

              for (const [prop, value] of Object.entries(values)) {
                const { passed, value: sanValue } = this.methods.values.sanitize.mono(prop, value, fallbacks?.[prop])
                results[prop] = { passed, value }
                if (sanValue) sanValues[prop] = sanValue
              }

              const passed = Object.values(results).every(({ passed }) => passed)

              return { passed, values: sanValues, results }
            },
          },
        },
        SVs: {
          retrieve: () => this.methods.utils.jsonToObj(localStorage.getItem(storageKeys.state) ?? ''),
          store: (values: Record<string, string>) => {
            const areStored = this.methods.utils.isSameObj(values, this.methods.SVs.retrieve())
            if (!areStored) localStorage.setItem(storageKeys.state, JSON.stringify(values))
          },
        },
        TAs: {
          get: {
            mono: (prop) => this.target.getAttribute(`data-${prop}`),
          },
          set: (values) => {
            for (const [prop, value] of Object.entries(values)) {
              const isSet = this.methods.TAs.get.mono(prop) === value
              if (!isSet) this.target.setAttribute(`data-${prop}`, value)
            }
          },
        },
        SM: {
          retrieve: () => localStorage.getItem(storageKeys.mode),
          store: (mode) => {
            const isStored = this.methods.SM.retrieve() === mode
            if (!isStored) localStorage.setItem(storageKeys.mode, mode)
          },
        },
        RMs: {
          getSystemPref: () => {
            const supportsPref = window.matchMedia('(prefers-color-scheme)').media !== 'not all'
            return supportsPref ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : undefined
          },
          derive: (mode) => {
            if (!this.store.mode) return
            const { prop, stratObj, resolvedModes } = this.store.mode

            const isSystemMode = stratObj.strategy === 'system' && stratObj.enableSystem && mode === (stratObj.customKeys?.system ?? 'system')
            if (isSystemMode) return this.methods.RMs.getSystemPref() ?? resolvedModes[stratObj.fallback]

            return resolvedModes[mode]
          },
        },
        CS: {
          get: () => this.target.style.colorScheme,
          set: (RM) => {
            const isSet = this.methods.CS.get() === RM
            if (!isSet) this.target.style.colorScheme = RM
          },
        },
        MC: {
          get: () => (this.target.classList.contains('light') ? 'light' : this.target.classList.contains('dark') ? 'dark' : undefined),
          set: (RM) => {
            const isSet = this.methods.MC.get() === RM
            if (isSet) return

            const other = RM === 'light' ? 'dark' : 'light'
            this.target.classList.replace(other, RM) || this.target.classList.add(RM)
          },
        },
        state: {
          get: {
            all: () => this.store.state,
          },
          set: {
            mono: (prop, value) => {
              const currState = this.methods.state.get.all()
              const newState = { ...currState, [prop]: value }

              this.methods.state.apply(newState)
            },
            multi: (values) => {
              const currState = this.methods.state.get.all()
              const newState = { ...currState, ...values }

              this.methods.state.apply(newState)
            },
          },
          apply: (state) => {
            this.store.state = state
            this.methods.SVs.store(state)
            this.methods.TAs.set(state)

            if (this.store.mode) {
              const { prop, store, selectors } = this.store.mode

              const SM = Object.entries(state).find(([key]) => key === prop)![1]
              if (store) this.methods.SM.store(SM)

              const RM = this.methods.RMs.derive(SM) as ColorScheme
              if (selectors.includes('colorScheme')) this.methods.CS.set(RM)
              if (selectors.includes('class')) this.methods.MC.set(RM)
            }
          },
        },
      }
    }

    init() {
      const { values } = this.methods.values.sanitize.multi(this.methods.SVs.retrieve())
      this.methods.state.set.multi(values)

      window.addEventListener(events.state.sync.request, () => {
        const state = this.methods.state.get.all()
        window.dispatchEvent(new CustomEvent<StateSync_Event['detail']>(events.state.sync.response, { detail: { state } }))
      })
    }
  }

  const store = new ThemingStore(config)
  store.init()
}
