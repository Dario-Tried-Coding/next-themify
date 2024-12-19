import { Config, Keys } from "@dariotriedcoding/next-themify/types"
import { useNextThemify } from "@dariotriedcoding/next-themify"

const keys = { theme: ['custom-1', 'custom-2'], radius: ['custom-radius-1', 'custom-radius-2'] } as const satisfies Keys
export type TKeys = typeof keys

export const config = {

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