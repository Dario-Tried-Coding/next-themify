import { ModeConfig } from "../types/core"
import { ResolvedMode } from "../types/react"
import { getSystemPref } from "./utils"

export class DOMManager {
  private target = document.documentElement
  private modeConfig: ModeConfig

  constructor({ modeConfig }: { modeConfig: ModeConfig }) {
    this.modeConfig = modeConfig
  }

  #deriveRM(mode: string) {
    if (!this.modeConfig) return
    const { stratObj, resolvedModes } = this.modeConfig

    const isSystemMode = stratObj.strategy === 'system' && stratObj.enableSystem && mode === (stratObj.customKeys?.system ?? 'system')
    if (isSystemMode) return getSystemPref() ?? resolvedModes[stratObj.fallback]

    return resolvedModes[mode]
  }

  #setCS(RM: ResolvedMode) {
    const isSet = this.target.style.colorScheme === RM
    if (!isSet) this.target.style.colorScheme = RM
  }

  #setMC(RM: ResolvedMode) {
    const isSet = this.target.classList.contains('light') ? 'light' : this.target.classList.contains('dark') ? 'dark' : undefined
    if (isSet === RM) return

    const other = RM === 'light' ? 'dark' : 'light'
    this.target.classList.replace(other, RM) || this.target.classList.add(RM)
  }

  setAttr(prop: string, value: string) {
    const isSet = this.target.getAttribute(`data-${prop}`) === value
    if (!isSet) {
      this.target.setAttribute(`data-${prop}`, value)

      const isMode = this.modeConfig?.prop === prop
      if (isMode) {
        const RM = this.#deriveRM(value) as ResolvedMode
        if (this.modeConfig?.selectors.includes('colorScheme')) this.#setCS(RM)
        if (this.modeConfig?.selectors.includes('class')) this.#setMC(RM)
      }
    }
  }

  setAttrs(values: Map<string, string>) {
    for (const [prop, value] of values.entries()) this.setAttr(prop, value)
  }
}