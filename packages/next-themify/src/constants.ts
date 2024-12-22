export type DEFAULT = 'default'
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

export type LIGHT = 'light'
export type DARK = 'dark'
export type SYSTEM = 'system'

export const COLOR_SCHEMES = {
  light: 'light',
  dark: 'dark',
} as const
export type Color_Scheme = typeof COLOR_SCHEMES[keyof typeof COLOR_SCHEMES]

export const CONFIG_SK = 'next-themify' as const
export const MODE_SK = 'theme' as const
export const CUSTOM_SEK = 'custom-storage-event' as const