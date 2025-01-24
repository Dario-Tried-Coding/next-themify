import { useMemo } from 'react';
import { DEFAULT_BEHAVIOUR } from '../constants';
import { StaticConfig } from '../types/react';
import { ScriptParams } from '../types/script';
import { Constraints } from '../types/core';

export const useConfigProcessor = ({ config, modeHandling }: { config: StaticConfig; modeHandling: DEFAULT_BEHAVIOUR['mode'] }) => {
  const constraints = useMemo(() => {
    const constraints: Constraints = new Map()

    // prettier-ignore
    for (const [prop, stratObj] of Object.entries(config)) {
      switch (stratObj.strategy) {
        case 'mono': constraints.set(prop, { available: new Set([stratObj.key]), base: stratObj.key }); break;
        case 'multi': constraints.set(prop, { available: new Set(Array.isArray(stratObj.keys) ? stratObj.keys : Object.keys(stratObj.keys)), base: stratObj.preferred }); break;
        case 'system': {
          constraints.set(prop, {
            available: new Set([
              stratObj.customKeys?.light ?? 'light',
              stratObj.customKeys?.dark ?? 'dark',
              ...(stratObj.enableSystem !== false ? [stratObj.customKeys?.system ?? 'system'] : []),
              ...(stratObj.customKeys?.custom ? Object.keys(stratObj.customKeys.custom) : []),
            ]),
            base: stratObj.preferred,
          })
        }; break;
        default: break;
      }
    }

    return constraints
  }, [config])

  const modeConfig = useMemo((): ScriptParams['config']['modeConfig'] => {
    const prop = Object.entries(config).find(([prop, stratObj]) => stratObj.type === 'mode')?.[0]
    const stratObj = Object.values(config).find((stratObj) => stratObj.type === 'mode')

    if (!prop || !stratObj) return null

    const selectors = stratObj.selectors ?? modeHandling.selectors
    const store = stratObj.store ?? modeHandling.store

    const resolvedModes: NonNullable<ScriptParams['config']['modeConfig']>['resolvedModes'] = {}
    // prettier-ignore
    switch (stratObj?.strategy) {
      case 'mono': resolvedModes[stratObj.key] = stratObj.colorScheme; break;
      case 'multi': Object.entries(stratObj.keys).forEach(([key, colorScheme]) => (resolvedModes[key] = colorScheme)); break;
      case 'system': {
        resolvedModes[stratObj.customKeys?.light ?? 'light'] = 'light'
        resolvedModes[stratObj.customKeys?.dark ?? 'dark'] = 'dark'
        if (stratObj.customKeys?.custom) Object.entries(stratObj.customKeys.custom).forEach(([key, colorScheme]) => (resolvedModes[key] = colorScheme))
      }; break;
      default: break;
    }

    return { prop, stratObj, selectors, store, resolvedModes }
  }, [config])

  return { constraints, modeConfig }
}
