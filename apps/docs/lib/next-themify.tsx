import { ThemingProvider as NextThemifyProvider, useTheming as useNextThemify } from 'next-themify'
import { Config, Keys } from 'next-themify/types'
import { FC, PropsWithChildren } from 'react'

const keys = { theme: ['custom-1', 'custom-2'], radius: ['custom-radius-1', 'custom-radius-2'], prova: {custom: ['custom-mode-1']} } as const satisfies Keys
export type TKeys = typeof keys

export const config = {
  theme: {
    type: 'generic',
    strategy: 'multi',
    keys: ['custom-1', 'custom-2'],
    preferred: 'custom-1'
  },
  radius: {
    type: 'generic',
    strategy: 'multi',
    keys: ['custom-radius-1', 'custom-radius-2'],
    preferred: 'custom-radius-1'
  },
  prova: {
    type: 'mode',
    strategy: 'light-dark',
    enableSystem: true,
    keys: {
      light: 'light',
      dark: 'dark',
      system: 'system',
      custom: [{key: 'custom-mode-1', colorScheme: 'dark'}]
    },
    fallback: 'light',
    preferred: 'dark',
  }
} as const satisfies Config<TKeys>
export type TConfig = typeof config

export const ThemingProvider: FC<PropsWithChildren> = ({ children }) => <NextThemifyProvider<TKeys, TConfig> config={config}>{children}</NextThemifyProvider>
export const useTheming = useNextThemify<TKeys, TConfig>
