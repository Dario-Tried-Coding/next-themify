import { Config, Props } from 'next-themify/types'
import { NextThemifyProvider, useNextThemify } from 'next-themify'
import { FC, PropsWithChildren } from 'react'

const props = ['mode', { prop: 'color', values: 'blue' }] as const satisfies Props
type TProps = typeof props

const config = {
  color: {
    type: 'generic',
    strategy: 'mono',
    key: 'blue',
  },
  mode: {
    type: 'mode',
    strategy: 'system',
    preferred: 'system',
    fallback: 'dark',
  },
} as const satisfies Config<TProps>
type TConfig = typeof config

export const ThemingProvider: FC<PropsWithChildren> = ({ children }) => <NextThemifyProvider<TProps, TConfig> config={config}>{children}</NextThemifyProvider>
export const useTheming = useNextThemify<TProps, TConfig>
