export const DEFAULT = 'default' as const
export type DEFAULT = typeof DEFAULT

export type STATIC = 'static-type'

export const STRATS = {
  mono: 'mono',
  multi: 'multi',
  light_dark: 'light_dark',
  custom: 'custom',
} as const
export type MONO = (typeof STRATS)['mono']
export type MULTI = (typeof STRATS)['multi']
export type LIGHT_DARK = (typeof STRATS)['light_dark']
export type CUSTOM = (typeof STRATS)['custom']

export const MODES = {
  light: 'light',
  dark: 'dark',
  system: 'system',
} as const
export type LIGHT = (typeof MODES)['light']
export type DARK = (typeof MODES)['dark']
export type SYSTEM = (typeof MODES)['system']

export const COLOR_SCHEMES = {
  light: 'light',
  dark: 'dark',
} as const
export type Color_Scheme = typeof COLOR_SCHEMES[keyof typeof COLOR_SCHEMES]

export const CONFIG_SK = 'next-themify' as const
export const MODE_SK = 'theme' as const