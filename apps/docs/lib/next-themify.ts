import { useNextThemify } from 'next-themify'
import { Config, Keys } from 'next-themify/types'

const keys = { theme: ['custom-1', 'custom-2'], radius: ['custom-radius-1', 'custom-radius-2'] } as const satisfies Keys
export type TKeys = typeof keys

export const config = {
  mode: {
    strategy: 'mono',
    key: 'default',
    colorScheme: 'dark'
  },
  theme: {
    strategy: 'multi',
    keys: ['custom-1', 'custom-2'],
    preferred: 'custom-2',
  },
  radius: {
    strategy: 'multi',
    keys: ['custom-radius-1', 'custom-radius-2'],
    preferred: 'custom-radius-2',
  },
} as const satisfies Config<TKeys>
export type TConfig = typeof config


export const useTheming = useNextThemify<TKeys, TConfig>