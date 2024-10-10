export const DEFAULT = 'default' as const
export type DEFAULT = typeof DEFAULT

export const STRATS = {
  mono: 'mono',
  multi: {
    base: 'multi',
    light_dark: 'light_dark',
    custom: 'custom',
  },
} as const
export type MONO = (typeof STRATS)['mono']
export type MULTI = (typeof STRATS)['multi']['base']
export type LIGHT_DARK = (typeof STRATS)['multi']['light_dark']
export type CUSTOM = (typeof STRATS)['multi']['custom']

export const MODES = {
  light: 'light',
  dark: 'dark',
  system: 'system',
} as const
export type LIGHT = (typeof MODES)['light']
export type DARK = (typeof MODES)['dark']
export type SYSTEM = (typeof MODES)['system']

export const CONFIG_SK = 'themes' as const
