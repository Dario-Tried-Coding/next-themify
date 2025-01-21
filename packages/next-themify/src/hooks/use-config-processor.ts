import { useMemo } from 'react';
import { Selector, StaticConfig } from '../types/react';
import { ScriptParams } from '../types/script';
import { DEFAULT_BEHAVIOUR } from '../constants';

export const useConfigProcessor = ({ config, modeHandling }: { config: StaticConfig; modeHandling: DEFAULT_BEHAVIOUR['mode'] }) => {
  const constraints = useMemo(() => {
    const constraints: ScriptParams['config']['constraints'] = {}

    // prettier-ignore
    for (const [prop, stratObj] of Object.entries(config)) {
      switch (stratObj.strategy) {
        case 'mono': constraints[prop] = { allowed: [stratObj.key], preferred: stratObj.key }; break;
        case 'multi': constraints[prop] = { allowed: Array.isArray(stratObj.keys) ? stratObj.keys : Object.keys(stratObj.keys), preferred: stratObj.preferred }; break;
        case 'system': {
          constraints[prop] = {
            allowed: [
              stratObj.customKeys?.light ?? 'light',
              stratObj.customKeys?.dark ?? 'dark',
              ...(stratObj.enableSystem !== false ? [stratObj.customKeys?.system ?? 'system'] : []),
              ...(stratObj.customKeys?.custom ? Object.keys(stratObj.customKeys.custom) : []),
            ],
            preferred: stratObj.preferred,
          }
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
